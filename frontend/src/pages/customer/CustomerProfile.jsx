import { useState, useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../../AuthContext';
import {
  User,
  Lock,
  ShieldCheck,
  Bell,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Smartphone,
  Edit3,
  X,
  KeyRound,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import api from '../../api';
import { useToast } from '../../components/ui/toast';

export default function CustomerProfile() {
  const { user, updateUser } = useContext(AuthContext);
  const { error: showError, success: showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState('profile');

  const [profileForm, setProfileForm] = useState({
    nama: user?.nama || user?.name || '',
    email: user?.email || '',
    kontak: user?.kontak || '',
    alamat: ''
  });
  const [verifiedPhone, setVerifiedPhone] = useState(user?.kontak || '');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState('input'); // 'input' | 'otp'
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [preferences, setPreferences] = useState({
    waReminders: true,
    waTechnicianStatus: true,
    waInvoice: true
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get('/customer/profile');
        const data = res.data?.data || res.data || res || {};
        const u = data.user || user || {};
        const c = data.customer || {};
        const currentPhone = u.kontak || c.kontak || '';
        setProfileForm({
          nama: u.nama || u.name || '',
          email: u.email || '',
          kontak: currentPhone,
          alamat: c.alamat || ''
        });
        setVerifiedPhone(currentPhone);
      } catch {
        const fallbackPhone = user?.kontak || '';
        setProfileForm({
          nama: user?.nama || user?.name || '',
          email: user?.email || '',
          kontak: fallbackPhone,
          alamat: ''
        });
        setVerifiedPhone(fallbackPhone);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        nama: profileForm.nama,
        email: profileForm.email,
        kontak: verifiedPhone,
        alamat: profileForm.alamat
      };
      const res = await api.patch('/customer/profile', payload);
      const updatedUser = res?.data?.user || res?.user || {
        nama: profileForm.nama,
        email: profileForm.email,
        kontak: verifiedPhone
      };
      updateUser(updatedUser);
      showSuccess('Profil Anda berhasil diperbarui.');
    } catch (err) {
      showError('Gagal memperbarui profil: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestPhoneChangeOtp = async (e) => {
    e.preventDefault();
    const cleaned = String(newPhoneInput || '').replace(/\D/g, '');
    if (cleaned.length < 9) {
      showError('Masukkan nomor WhatsApp baru yang valid (minimal 9 digit).');
      return;
    }
    setSendingPhoneOtp(true);
    try {
      const res = await api.post('/customer/profile/request-phone-change', {
        new_kontak: newPhoneInput.trim()
      });
      setPhoneStep('otp');
      if (res?._dev_otp) {
        setPhoneOtpCode(String(res._dev_otp));
      }
      showSuccess(res?.message || 'Kode OTP verifikasi nomor baru telah dikirim ke WhatsApp Anda.');
    } catch (err) {
      showError(err?.response?.data?.error?.message || err?.message || 'Gagal meminta kode OTP perubahan nomor.');
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleConfirmPhoneChangeOtp = async (e) => {
    e.preventDefault();
    if (!phoneOtpCode || phoneOtpCode.trim().length !== 6) {
      showError('Masukkan 6 digit kode OTP verifikasi.');
      return;
    }
    setVerifyingPhoneOtp(true);
    try {
      const res = await api.patch('/customer/profile', {
        nama: profileForm.nama,
        email: profileForm.email,
        alamat: profileForm.alamat,
        kontak: newPhoneInput.trim(),
        phone_otp_code: phoneOtpCode.trim()
      });
      const updatedPhone = res?.user?.kontak || res?.data?.user?.kontak || newPhoneInput.trim();
      setVerifiedPhone(updatedPhone);
      setProfileForm((prev) => ({ ...prev, kontak: updatedPhone }));
      if (res?.user || res?.data?.user) {
        updateUser(res.user || res.data.user);
      }
      setIsChangingPhone(false);
      setPhoneStep('input');
      setNewPhoneInput('');
      setPhoneOtpCode('');
      showSuccess('Nomor WhatsApp berhasil diverifikasi dan diperbarui.');
    } catch (err) {
      showError(err?.response?.data?.error?.message || err?.message || 'Verifikasi OTP gagal.');
    } finally {
      setVerifyingPhoneOtp(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return showError('Konfirmasi password baru tidak cocok.');
    }
    if (passwordForm.new_password.length < 8) {
      return showError('Password baru minimal 8 karakter.');
    }

    setSavingPassword(true);
    try {
      await api.patch('/auth/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      showSuccess('Password Anda berhasil diperbarui.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      showError('Gagal mengubah password: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profil Saya', icon: User },
    { id: 'security', label: 'Keamanan & Sandi', icon: Lock },
    { id: 'preferences', label: 'Notifikasi & WhatsApp', icon: Bell },
    { id: 'benefits', label: 'Keanggotaan Member', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Pengaturan Akun &amp; Profil
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data identitas, keamanan sandi, alamat utama servis, dan preferensi notifikasi Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200/80 px-3.5 py-1.5 rounded-2xl shadow-2xs">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <div className="text-left">
            <p className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Member Aktif</p>
            <p className="text-xs font-bold text-slate-800">Diskon Jasa 10% Otomatis</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer',
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white text-slate-600 hover:text-blue-600 hover:bg-sky-50/60 border border-slate-200/70'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          <div className="space-y-4">
            <Card className="rounded-3xl border-sky-200/80 shadow-xs overflow-hidden bg-white">
              <div className="p-6 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 text-white relative">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white font-black text-2xl flex items-center justify-center shadow-lg mb-3">
                  {(profileForm.nama || 'P').charAt(0).toUpperCase()}
                </div>
                <h3 className="font-black text-lg text-white leading-tight">{profileForm.nama || 'Pelanggan'}</h3>
                <p className="text-xs text-sky-100 font-medium mt-0.5">{profileForm.email || 'Email belum diatur'}</p>

                <div className="mt-4 pt-4 border-t border-white/15 flex items-center justify-between text-xs">
                  <span className="text-sky-100">ID Member</span>
                  <span className="font-mono font-bold text-white">#MBR-{String(user?.id || 1).padStart(4, '0')}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-sky-100">Status Nomor WA</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-300" />
                    Terverifikasi
                  </span>
                </div>
              </div>
              <CardContent className="p-5 text-xs text-slate-600 space-y-3 bg-sky-50/40">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>Data profil digunakan teknisi untuk konfirmasi kunjungan servis &amp; penerbitan faktur.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>Nomor WhatsApp terverifikasi dikunci demi keamanan akun. Gunakan fitur Ubah Nomor untuk verifikasi ulang OTP.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Data Pribadi &amp; Kontak Utama</h2>
                </div>
              </div>

              <CardContent className="p-6">
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="customer-nama" className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Lengkap *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="customer-nama"
                        type="text"
                        required
                        value={profileForm.nama}
                        onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                        placeholder="Contoh: Kuat Riawan"
                        className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customer-email" className="block text-xs font-bold text-slate-700 mb-1">
                        Alamat Email *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          id="customer-email"
                          type="email"
                          required
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="nama@email.com"
                          className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="customer-kontak" className="block text-xs font-bold text-slate-700">
                          Nomor WhatsApp Terverifikasi
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPhone((prev) => !prev);
                            setPhoneStep('input');
                            setNewPhoneInput('');
                            setPhoneOtpCode('');
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isChangingPhone ? 'Batal Ubah' : 'Ubah Nomor'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          id="customer-kontak"
                          type="text"
                          readOnly
                          aria-readonly="true"
                          value={verifiedPhone || '-'}
                          className="block w-full pl-10 pr-24 py-2.5 rounded-2xl border border-slate-200 bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold font-mono cursor-not-allowed select-all"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Terverifikasi
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="customer-alamat" className="block text-xs font-bold text-slate-700 mb-1">
                      Alamat Utama Servis (Rumah / Kantor)
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3.5 pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <textarea
                        id="customer-alamat"
                        rows="3"
                        value={profileForm.alamat}
                        onChange={(e) => setProfileForm({ ...profileForm, alamat: e.target.value })}
                        placeholder="Contoh: Jl. Teluk Langsa RT 02 / RW 16, Ciangsana, Gunung Putri, Kab. Bogor"
                        className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <Button
                      type="submit"
                      disabled={savingProfile || loadingProfile}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl h-11 px-6 shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2 text-xs sm:text-sm transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingProfile ? 'Menyimpan Perubahan...' : 'Simpan Perubahan Profil'}</span>
                    </Button>
                  </div>
                </form>

                {isChangingPhone && (
                  <div className="mt-5 pt-5 border-t border-sky-100 bg-sky-50/60 p-4 sm:p-5 rounded-2xl border space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-blue-600" />
                        <h3 className="text-xs sm:text-sm font-black text-slate-900">
                          Verifikasi Perubahan Nomor WhatsApp
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChangingPhone(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {phoneStep === 'input' ? (
                      <form onSubmit={handleRequestPhoneChangeOtp} className="space-y-3">
                        <div>
                          <label htmlFor="new-phone-input" className="block text-xs font-bold text-slate-700 mb-1">
                            Nomor WhatsApp Baru *
                          </label>
                          <input
                            id="new-phone-input"
                            type="tel"
                            required
                            value={newPhoneInput}
                            onChange={(e) => setNewPhoneInput(e.target.value)}
                            placeholder="Contoh: 081385293137"
                            className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="submit"
                            disabled={sendingPhoneOtp}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-9 px-4"
                          >
                            {sendingPhoneOtp ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                Mengirim OTP...
                              </>
                            ) : (
                              'Kirim Kode OTP Verifikasi'
                            )}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleConfirmPhoneChangeOtp} className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor="readonly-target-phone" className="block text-xs font-bold text-slate-700">
                              Nomor WhatsApp Tujuan (Terkunci Selama Verifikasi)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setPhoneStep('input');
                                setPhoneOtpCode('');
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Ganti Nomor
                            </button>
                          </div>
                          <input
                            id="readonly-target-phone"
                            type="text"
                            readOnly
                            aria-readonly="true"
                            value={newPhoneInput}
                            className="block w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-xs font-mono font-bold cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label htmlFor="phone-change-otp-code" className="block text-xs font-bold text-slate-700 mb-1">
                            Kode Verifikasi OTP (6 Digit) *
                          </label>
                          <input
                            id="phone-change-otp-code"
                            type="text"
                            maxLength={6}
                            required
                            value={phoneOtpCode}
                            onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-center tracking-[0.35em] text-sm font-mono font-black focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="submit"
                            disabled={verifyingPhoneOtp || phoneOtpCode.length !== 6}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 px-4"
                          >
                            {verifyingPhoneOtp ? 'Memverifikasi...' : 'Verifikasi & Simpan Nomor Baru'}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-2xl"
        >
          <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Perbarui Password Akun</h2>
              </div>
            </div>

            <CardContent className="p-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="customer-current-pass" className="block text-xs font-bold text-slate-700 mb-1">
                    Password Saat Ini *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="customer-current-pass"
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      placeholder="Masukkan password Anda saat ini"
                      className="block w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="customer-new-pass" className="block text-xs font-bold text-slate-700 mb-1">
                    Password Baru * (Minimal 8 karakter)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="customer-new-pass"
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      placeholder="Minimal 8 karakter kombinasi huruf & angka"
                      className="block w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="customer-confirm-pass" className="block text-xs font-bold text-slate-700 mb-1">
                    Ulangi Password Baru *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="customer-confirm-pass"
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      placeholder="Ulangi password baru persis sama"
                      className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingPassword}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl h-11 px-6 shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2 text-xs sm:text-sm transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingPassword ? 'Memperbarui Sandi...' : 'Perbarui Password'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === 'preferences' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-2xl"
        >
          <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Preferensi Notifikasi &amp; WhatsApp Gateway</h2>
              </div>
            </div>

            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="space-y-0.5 max-w-md">
                  <h3 className="font-black text-xs sm:text-sm text-slate-900">Pengingat Perawatan Berkala (3-4 Bulan)</h3>
                  <p className="text-xs text-slate-500">
                    Kirim pesan WhatsApp otomatis ketika unit AC Anda sudah mendekati jadwal cuci rutin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreferences({ ...preferences, waReminders: !preferences.waReminders });
                    showSuccess('Pengaturan pengingat berhasil disimpan.');
                  }}
                  className={cn(
                    'w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0',
                    preferences.waReminders ? 'bg-blue-600' : 'bg-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                      preferences.waReminders ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="space-y-0.5 max-w-md">
                  <h3 className="font-black text-xs sm:text-sm text-slate-900">Pemberitahuan Status Teknisi</h3>
                  <p className="text-xs text-slate-500">
                    Dapatkan kabar saat teknisi sudah ditugaskan, sedang meluncur ke lokasi, dan selesai bekerja.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreferences({ ...preferences, waTechnicianStatus: !preferences.waTechnicianStatus });
                    showSuccess('Pengaturan notifikasi teknisi berhasil disimpan.');
                  }}
                  className={cn(
                    'w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0',
                    preferences.waTechnicianStatus ? 'bg-blue-600' : 'bg-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                      preferences.waTechnicianStatus ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="space-y-0.5 max-w-md">
                  <h3 className="font-black text-xs sm:text-sm text-slate-900">E-Invoice &amp; Kartu Garansi Digital</h3>
                  <p className="text-xs text-slate-500">
                    Otomatis kirimkan tautan unduh nota resmi dan sertifikat garansi servis ke WhatsApp Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreferences({ ...preferences, waInvoice: !preferences.waInvoice });
                    showSuccess('Pengaturan invoice digital berhasil disimpan.');
                  }}
                  className={cn(
                    'w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0',
                    preferences.waInvoice ? 'bg-blue-600' : 'bg-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                      preferences.waInvoice ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === 'benefits' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 max-w-3xl"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50 to-sky-50/80 border border-blue-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <h3 className="font-black text-base text-slate-900">Diskon Jasa 10% Otomatis</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Khusus akun member, setiap pemesanan layanan mendapatkan potongan langsung 10% dari biaya jasa servis (tidak termasuk suku cadang).
              </p>
              <div className="pt-2">
                <Badge variant="success" className="font-bold text-[10px]">TERAPLIKASI OTOMATIS</Badge>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/80 border border-emerald-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
              <h3 className="font-black text-base text-slate-900">Garansi Resmi 14 / 30 / 45 Hari</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Jaminan garansi pengerjaan sesuai paket layanan. Jika AC mengalami kendala yang sama, teknisi NARA AC melakukan kunjungan pemeriksaan gratis.
              </p>
              <div className="pt-2">
                <Badge variant="success" className="font-bold text-[10px]">PERLINDUNGAN PENUH</Badge>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
