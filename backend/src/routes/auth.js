const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { query, withTx } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, optionalAuth, signToken } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { csrfTokenHandler, clearCsrfTokens } = require('../middleware/csrf');
const { normalizePhone } = require('../utils/ids');
const { E } = require('../errors');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan login. Coba lagi setelah 15 menit.' },
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
  password: Joi.string().min(8).max(100).required().label('Password'),
});

router.post('/login', loginLimiter, validate(loginSchema), wrap(async (req, res) => {
  const u = (await query('SELECT * FROM users WHERE lower(email)=lower($1)', [req.body.email])).rows[0];
  const bad = () => E.unauthorized('Email atau password salah.');
  if (!u || !u.aktif) throw bad();
  if (!(await bcrypt.compare(req.body.password, u.password_hash))) throw bad();
  const token = signToken(u);
  const user = {
    id: u.id,
    nama: u.nama,
    email: u.email,
    role: u.role,
    kontak: u.kontak || null,
    technician_id: u.technician_id || null,
    customer_id: u.customer_id || null,
  };

  res.cookie('nara_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({ user });
}));

router.post('/staff/login', loginLimiter, validate(loginSchema), wrap(async (req, res) => {
  const u = (await query('SELECT * FROM users WHERE lower(email)=lower($1)', [req.body.email])).rows[0];
  const bad = () => E.unauthorized('Email atau password staf salah.');
  if (!u || !u.aktif) throw bad();
  if (!(await bcrypt.compare(req.body.password, u.password_hash))) throw bad();

  if (u.role === 'customer') {
    throw E.forbidden('Akses ditolak. Halaman ini khusus untuk staf internal CV. Nara Teknindotama. Silakan masuk melalui Portal Pelanggan.');
  }

  const token = signToken(u);
  const user = {
    id: u.id,
    nama: u.nama,
    email: u.email,
    role: u.role,
    kontak: u.kontak || null,
    technician_id: u.technician_id || null,
    customer_id: null,
  };

  res.cookie('nara_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    user,
    message: `Selamat datang kembali, ${u.nama}.`,
  });
}));

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan OTP WhatsApp. Silakan tunggu 15 menit sebelum mencoba kembali.' },
  }),
});

const requestOtpSchema = Joi.object({
  kontak: Joi.string().trim().max(30).required().label('Nomor WhatsApp'),
});

router.post('/customer/request-otp', otpLimiter, validate(requestOtpSchema), wrap(async (req, res) => {
  const { whatsappSend } = require('../services/reminderService');

  const phone = normalizePhone(req.body.kontak);
  if (!phone) {
    throw E.validation('Nomor WhatsApp tidak valid.', { kontak: 'Gunakan nomor HP/WhatsApp Indonesia yang aktif, contoh: 081234567890.' });
  }

  const existingUser = (await query(
    `SELECT u.id, u.nama, u.aktif, u.role
     FROM users u
     LEFT JOIN customers c ON c.id = u.customer_id
     WHERE (u.kontak = $1 OR c.kontak = $1) AND u.role = 'customer'`,
    [phone],
  )).rows[0];

  const existingCustomer = !existingUser ? (await query('SELECT id, nama, aktif FROM customers WHERE kontak = $1', [phone])).rows[0] : null;

  if (!existingUser && !existingCustomer) {
    throw E.notFound('Nomor WhatsApp belum terdaftar sebagai member NARA AC. Silakan lakukan pendaftaran member mandiri terlebih dahulu.', {
      not_registered: true,
      kontak: phone,
    });
  }

  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await query(
    'INSERT INTO whatsapp_otps (kontak, otp_hash, expires_at) VALUES ($1, $2, $3)',
    [phone, otpHash, expiresAt],
  );

  const namaTujuan = existingUser?.nama || existingCustomer?.nama || 'Pelanggan';
  const textMessage = `Halo Bapak/Ibu *${namaTujuan}*,\n\nKode OTP masuk Portal Pelanggan NARA AC Anda adalah:\n\n*${rawOtp}*\n\nKode ini berlaku selama 5 menit. Demi keamanan akun Anda, jangan berikan kode ini kepada siapapun termasuk petugas NARA AC.\n\nTerima kasih.`;

  try {
    await whatsappSend(phone, textMessage);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth-otp] Gagal kirim WA via gateway:', err?.message);
    }
  }

  res.json({
    success: true,
    message: `Kode OTP verifikasi telah dikirimkan ke nomor WhatsApp ${phone.slice(0, 4)}****${phone.slice(-2)}.`,
    kontak: phone,
    ...(process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_OTP === 'true' ? { _dev_otp: rawOtp } : {}),
  });
}));

const verifyOtpSchema = Joi.object({
  kontak: Joi.string().trim().max(30).required().label('Nomor WhatsApp'),
  otp: Joi.string().trim().length(6).required().label('Kode OTP'),
});

router.post('/customer/verify-otp', validate(verifyOtpSchema), wrap(async (req, res) => {
  const rawKontak = String(req.body.kontak || '').trim();
  if (rawKontak.includes('*') || rawKontak.includes('•')) {
    throw E.validation('Nomor WhatsApp tidak valid.', { kontak: 'Gunakan nomor WhatsApp asli yang telah diverifikasi.' });
  }
  const phone = normalizePhone(rawKontak);
  if (!phone) {
    throw E.validation('Nomor WhatsApp tidak valid.', { kontak: 'Gunakan nomor WhatsApp Indonesia yang valid.' });
  }

  const tokenHash = crypto.createHash('sha256').update(req.body.otp.trim()).digest('hex');

  const user = await withTx(async (client) => {
    const otpRow = (await client.query(
      `SELECT id, otp_hash, expires_at, attempts, is_used
       FROM whatsapp_otps
       WHERE kontak = $1 AND is_used = false AND expires_at > now()
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [phone],
    )).rows[0];

    if (!otpRow) {
      throw E.validation('Kode OTP tidak valid atau telah kedaluwarsa. Silakan minta kode baru.', {
        otp: 'OTP tidak valid atau kedaluwarsa.',
      });
    }

    if (otpRow.attempts >= 3) {
      await client.query('UPDATE whatsapp_otps SET is_used = true WHERE id = $1', [otpRow.id]);
      throw E.validation('Percobaan verifikasi telah melebihi batas. Silakan minta kode OTP baru.', {
        otp: 'Melebihi batas percobaan.',
      });
    }

    if (otpRow.otp_hash !== tokenHash) {
      await client.query('UPDATE whatsapp_otps SET attempts = attempts + 1 WHERE id = $1', [otpRow.id]);
      throw E.validation('Kode OTP yang Anda masukkan salah. Periksa kembali WhatsApp Anda.', {
        otp: 'Kode OTP salah.',
      });
    }

    await client.query('UPDATE whatsapp_otps SET is_used = true WHERE id = $1', [otpRow.id]);

    let u = (await client.query(
      `SELECT u.id, u.nama, u.email, u.role, u.kontak, u.customer_id, u.aktif
       FROM users u
       LEFT JOIN customers c ON c.id = u.customer_id
       WHERE (u.kontak = $1 OR c.kontak = $1) AND u.role = 'customer'`,
      [phone],
    )).rows[0];

    if (!u) {
      const cust = (await client.query('SELECT * FROM customers WHERE kontak = $1', [phone])).rows[0];
      if (!cust) {
        throw E.notFound('Profil pelanggan tidak ditemukan. Silakan mendaftar terlebih dahulu.');
      }
      const dummyPassword = crypto.randomBytes(24).toString('hex');
      const hash = await bcrypt.hash(dummyPassword, 10);
      const emailAutogen = `cust_${cust.id}_${phone}@member.naraac.id`;

      u = (await client.query(
        `INSERT INTO users (nama, email, password_hash, role, customer_id, kontak)
         VALUES ($1, $2, $3, 'customer', $4, $5)
         RETURNING id, nama, email, role, kontak, customer_id, aktif`,
        [cust.nama, emailAutogen, hash, cust.id, phone],
      )).rows[0];
    }

    if (!u.aktif) {
      throw E.unauthorized('Akun member Anda dinonaktifkan. Silakan hubungi Customer Service.');
    }

    return u;
  });

  const token = signToken(user);
  const userPayload = {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
    kontak: user.kontak || phone,
    technician_id: null,
    customer_id: user.customer_id,
  };

  res.cookie('nara_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    user: userPayload,
    message: `Selamat datang, ${user.nama}! Berhasil masuk ke Portal Pelanggan NARA AC.`,
  });
}));

const registerSchema = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama'),
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
  password: Joi.string().min(8).max(100).required().label('Password'),
  kontak: Joi.string().trim().max(20).required().label('Kontak'),
  alamat: Joi.string().trim().max(300).allow('').label('Alamat'),
});

router.post('/register', validate(registerSchema), wrap(async (req, res) => {
  const { nama, email, password, kontak, alamat } = req.body;
  const phone = normalizePhone(kontak);
  if (!phone) throw E.validation('Kontak tidak valid.', { kontak: 'Gunakan nomor HP Indonesia, contoh 081234567890.' });
  const hash = await bcrypt.hash(password, 10);
  const user = await withTx(async (client) => {
    let cust = (await client.query('SELECT * FROM customers WHERE kontak=$1', [phone])).rows[0];
    if (!cust) {
      cust = (await client.query(
        'INSERT INTO customers (nama, kontak, alamat, is_synthetic) VALUES ($1,$2,$3,false) RETURNING *',
        [nama, phone, alamat || null],
      )).rows[0];
    }
    const existing = (await client.query('SELECT id FROM users WHERE lower(email)=lower($1) OR customer_id=$2', [email, cust.id])).rows[0];
    if (existing) throw E.conflict('Email atau nomor HP sudah terdaftar. Silakan login.');
    const u = (await client.query(
      "INSERT INTO users (nama, email, password_hash, role, customer_id, kontak) VALUES ($1,$2,$3,'customer',$4,$5) RETURNING id, nama, email, role, customer_id, kontak",
      [nama, email, hash, cust.id, phone],
    )).rows[0];
    return u;
  });
  const token = signToken(user);
  const userResponse = {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
    kontak: user.kontak || phone,
    technician_id: null,
    customer_id: user.customer_id,
  };

  res.cookie('nara_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(201).json({ user: userResponse });
}));

router.get('/me', optionalAuth, wrap(async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  const u = (await query('SELECT id, nama, email, role, kontak, technician_id, customer_id, aktif, created_at FROM users WHERE id=$1', [req.user.id])).rows[0];
  if (!u || !u.aktif) return res.json({ user: null });
  res.json({ user: u });
}));

router.post('/profile/request-phone-change', requireAuth(), otpLimiter, validate(Joi.object({
  kontak_baru: Joi.string().trim().max(30).required().label('Nomor WhatsApp Baru'),
})), wrap(async (req, res) => {
  const phone = normalizePhone(req.body.kontak_baru);
  if (!phone) {
    throw E.validation('Nomor WhatsApp tidak valid.', { kontak_baru: 'Gunakan nomor WhatsApp Indonesia yang aktif, contoh: 081234567890.' });
  }
  const taken = (await query(
    `SELECT id FROM users WHERE kontak = $1 AND id <> $2`,
    [phone, req.user.id]
  )).rows[0];
  if (taken) {
    throw E.conflict('Nomor WhatsApp tersebut sudah digunakan oleh akun lain.');
  }

  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await query(
    'INSERT INTO whatsapp_otps (kontak, otp_hash, expires_at) VALUES ($1, $2, $3)',
    [phone, otpHash, expiresAt],
  );

  res.json({
    success: true,
    kontak_baru: phone,
    message: `Kode OTP verifikasi perubahan nomor telah dikirim ke ${phone}.`,
    ...(process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_OTP === 'true' ? { _dev_otp: rawOtp } : {}),
  });
}));

const updateProfileSchema = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama Lengkap'),
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
  kontak: Joi.string().trim().allow('', null).max(30).optional().label('Nomor WhatsApp / HP'),
  otp: Joi.string().trim().length(6).optional().allow('', null).label('Kode OTP Verifikasi Nomor Baru'),
});

router.patch('/profile', requireAuth(), validate(updateProfileSchema), wrap(async (req, res) => {
  const { nama, email, kontak, otp } = req.body;
  const existing = (await query('SELECT id FROM users WHERE lower(email)=lower($1) AND id<>$2', [email, req.user.id])).rows[0];
  if (existing) throw E.conflict('Email sudah digunakan oleh akun lain.');

  const prev = (await query('SELECT id, nama, email, kontak, role, customer_id FROM users WHERE id=$1', [req.user.id])).rows[0];
  let custPrev = null;
  if (prev?.customer_id) {
    custPrev = (await query('SELECT kontak FROM customers WHERE id=$1', [prev.customer_id])).rows[0];
  }
  const currentPhone = normalizePhone(prev?.kontak || custPrev?.kontak || '');
  const requestedPhone = kontak ? normalizePhone(kontak) : currentPhone;

  if (kontak && !requestedPhone) {
    throw E.validation('Nomor WhatsApp tidak valid.', { kontak: 'Gunakan nomor HP Indonesia yang valid.' });
  }

  if (prev?.role === 'customer' && currentPhone && requestedPhone && requestedPhone !== currentPhone) {
    if (!otp || String(otp).trim().length !== 6) {
      throw E.forbidden('Nomor telepon terverifikasi tidak dapat diubah secara langsung tanpa verifikasi kode OTP. Gunakan alur Ubah Nomor.');
    }
    const tokenHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    const otpRow = (await query(
      `SELECT id, otp_hash FROM whatsapp_otps
       WHERE kontak = $1 AND is_used = false AND expires_at > now()
       ORDER BY id DESC LIMIT 1`,
      [requestedPhone]
    )).rows[0];
    if (!otpRow || otpRow.otp_hash !== tokenHash) {
      throw E.forbidden('Kode OTP verifikasi nomor WhatsApp baru tidak valid atau sudah kedaluwarsa.');
    }
    await query('UPDATE whatsapp_otps SET is_used = true WHERE id = $1', [otpRow.id]);
  }

  const finalPhone = requestedPhone || currentPhone || null;

  const u = (await query(
    'UPDATE users SET nama=$1, email=$2, kontak=$3 WHERE id=$4 RETURNING id, nama, email, role, kontak, technician_id, customer_id, aktif, created_at',
    [nama, email, finalPhone, req.user.id]
  )).rows[0];

  const { audit } = require('../services/common');
  await audit(
    { query },
    req.user,
    'profile_updated',
    'user',
    req.user.id,
    { before: { nama: prev?.nama, email: prev?.email, kontak: prev?.kontak }, after: { nama: u.nama, email: u.email, kontak: u.kontak } }
  );

  res.json({ user: u, message: 'Profil berhasil diperbarui.' });
}));

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().label('Password Saat Ini'),
  new_password: Joi.string().min(8).max(100).required().label('Password Baru'),
});

router.patch('/password', requireAuth(), validate(changePasswordSchema), wrap(async (req, res) => {
  const { current_password, new_password } = req.body;
  const u = (await query('SELECT id, password_hash, email, role FROM users WHERE id=$1', [req.user.id])).rows[0];
  if (!u) throw E.notFound('Pengguna tidak ditemukan.');

  const match = await bcrypt.compare(current_password, u.password_hash);
  if (!match) throw E.validation('Password saat ini tidak sesuai.', { current_password: 'Password saat ini salah.' });

  const hash = await bcrypt.hash(new_password, 10);
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);

  const { audit } = require('../services/common');
  await audit({ query }, req.user, 'password_changed', 'user', req.user.id, { metadata: { note: 'User changed password' } });

  res.json({ ok: true, message: 'Password berhasil diperbarui.' });
}));

router.get('/csrf-token', requireAuth(), wrap(csrfTokenHandler));

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan reset password. Coba lagi dalam 15 menit.' },
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
});

router.post('/forgot-password', resetPasswordLimiter, validate(forgotPasswordSchema), wrap(async (req, res) => {
  const { email } = req.body;
  const u = (await query('SELECT id, nama, email, role, customer_id, aktif FROM users WHERE lower(email)=lower($1)', [email])).rows[0];

  const genericMessage = 'Jika alamat email terdaftar di sistem kami, instruksi pemulihan kata sandi telah diproses sesuai kanal yang terkonfigurasi.';

  if (u && u.aktif) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await query('UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [u.id]);
    await query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [u.id, tokenHash, expiresAt],
    );

    const { audit, notify } = require('../services/common');
    await audit(
      { query },
      { id: u.id, role: 'user', nama: u.nama },
      'password_reset_requested',
      'user',
      u.id,
      { metadata: { note: 'Password reset token generated' } },
    );

    await notify({ query }, {
      role: u.role || 'customer',
      id: u.role === 'customer' ? (u.customer_id || null) : null,
      title: 'Permintaan Reset Password',
      message: 'Permintaan reset password akun Anda telah diproses.',
      type: 'system',
    });

    if (process.env.NODE_ENV === 'test' || process.env.ENABLE_DEV_RESET_TOKEN === 'true') {
      return res.json({
        success: true,
        message: genericMessage,
        delivery_channel: 'in_app_notification',
        _dev_reset_token: rawToken,
      });
    }
  }

  res.json({
    success: true,
    message: genericMessage,
    delivery_channel: 'in_app_notification',
  });
}));

const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().hex().length(64).required().label('Token Reset'),
  new_password: Joi.string().min(8).max(100).required().label('Password Baru'),
});

router.post('/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), wrap(async (req, res) => {
  const { token, new_password: newPassword } = req.body;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await withTx(async (client) => {
    const row = (await client.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email, u.nama, u.role
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1 FOR UPDATE`,
      [tokenHash],
    )).rows[0];

    if (!row || row.used_at !== null || new Date(row.expires_at) < new Date()) {
      throw E.validation('Token reset password tidak valid atau sudah kedaluwarsa.', {
        token: 'Token kedaluwarsa atau tidak valid.',
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, row.user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [row.id]);
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND id <> $2', [row.user_id, row.id]);

    const { audit } = require('../services/common');
    await audit(
      client,
      { id: row.user_id, role: row.role, nama: row.nama },
      'password_reset_completed',
      'user',
      row.user_id,
      { metadata: { note: 'Password successfully reset via token' } },
    );
  });

  res.clearCookie('nara_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.json({
    success: true,
    message: 'Password berhasil direset. Silakan login kembali dengan password baru Anda.',
  });
}));

router.post('/logout', requireAuth(), wrap((req, res) => {
  clearCsrfTokens(req.user.id);
  res.clearCookie('nara_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.json({ success: true, message: 'Logout berhasil.' });
}));

module.exports = router;
