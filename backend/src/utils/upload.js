const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let multer;
try {
  multer = require('multer');
} catch {
  multer = Object.assign(
    () => ({ single: () => (_req, _res, cb) => cb(null) }),
    { memoryStorage: () => ({}) }
  );
}
const config = require('../config');
const { E } = require('../errors');

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = config.uploadDir;

function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 12 },
});

function saveValidatedBuffer(fileObj) {
  const kind = sniff(fileObj.buffer);
  if (!kind) {
    throw E.validation('Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.', { foto: 'Format tidak didukung.' });
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const storedName = `${crypto.randomBytes(16).toString('hex')}.${kind.ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), fileObj.buffer, { mode: 0o640 });
  return { storedName, mime: kind.mime, size: fileObj.size };
}

function receivePhoto(req, res, next) {
  uploader.single('foto')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(E.validation('Ukuran foto maksimal 5 MB.', { foto: 'Ukuran foto maksimal 5 MB.' }));
      return next(E.validation('Unggahan tidak valid.', { foto: 'Unggahan tidak valid.' }));
    }
    if (!req.file) return next(E.validation('Pilih foto terlebih dahulu.', { foto: 'Foto wajib diisi.' }));
    try {
      const saved = saveValidatedBuffer(req.file);
      req.savedFile = saved;
      req.uploadedFile = saved;
      return next();
    } catch (saveErr) {
      return next(saveErr.status ? saveErr : E.unavailable('Foto gagal disimpan. Coba lagi.'));
    }
  });
}

function handleOptionalPhoto(req, res, next, fieldNames) {
  const contentType = String(req?.headers?.['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }
  const fieldList = (Array.isArray(fieldNames) && fieldNames.length > 0)
    ? fieldNames
    : ['foto', 'bukti_file', 'file'];
  const fieldsMiddleware = uploader.fields(fieldList.map((name) => ({ name, maxCount: 1 })));
  return fieldsMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(E.validation('Ukuran berkas foto maksimal 5 MB.', { foto: 'Ukuran berkas maksimal 5 MB.' }));
      return next(E.validation('Unggahan berkas tidak valid.', { foto: 'Unggahan berkas tidak valid.' }));
    }
    let fileObj = null;
    if (req.files) {
      for (const f of fieldList) {
        if (req.files[f]?.[0]) {
          fileObj = req.files[f][0];
          break;
        }
      }
    }
    fileObj = fileObj || req.file || null;
    if (!fileObj) return next();
    try {
      const saved = saveValidatedBuffer(fileObj);
      req.savedFile = saved;
      req.uploadedFile = saved;
      return next();
    } catch (saveErr) {
      return next(saveErr.status ? saveErr : E.unavailable('Berkas foto gagal disimpan. Coba lagi.'));
    }
  });
}

function receiveOptionalPhoto(fieldsOrReq, res, next) {
  if (fieldsOrReq && fieldsOrReq.headers) {
    return handleOptionalPhoto(fieldsOrReq, res, next, ['foto', 'bukti_file', 'file']);
  }
  const fieldList = Array.isArray(fieldsOrReq)
    ? fieldsOrReq
    : (fieldsOrReq ? [fieldsOrReq] : ['foto', 'bukti_file', 'file']);
  return (req, resNext, nextNext) => handleOptionalPhoto(req, resNext, nextNext, fieldList);
}

const FILE_NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
const filePath = (name) => (FILE_NAME_RE.test(name) ? path.join(UPLOAD_DIR, name) : null);

module.exports = { receivePhoto, receiveOptionalPhoto, filePath, sniff, MAX_BYTES, UPLOAD_DIR };
