import { Link } from 'react-router-dom';
import { useContextualBack } from '../hooks/useContextualBack';
import { ArrowLeft, ShieldCheck, CheckCircle2, Phone, Mail, Building2, Lock, Bot, Database } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

export default function PrivacyPolicyPage() {
  const handleBack = useContextualBack('/');
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <CompanyLogo dark={false} iconSize="h-9 sm:h-10" />
          </Link>
          <button type="button" onClick={handleBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"><ArrowLeft className="w-4 h-4" /><span>Kembali</span></button>
        </div>
      </header>

      <section className="bg-gradient-to-b from-blue-700 via-blue-600 to-sky-600 text-white py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-700/60 border border-blue-400/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-100 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Kepatuhan Pelindungan Data Pribadi (UU PDP No. 27 Tahun 2022)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            Kebijakan Privasi
          </h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Komitmen CV. Nara Teknindotama dalam menjaga kerahasiaan, keamanan, dan integritas data pribadi pelanggan saat menggunakan layanan pemesanan, pengingat WhatsApp, dan asisten AI NARA AC.
          </p>
          <p className="text-xs text-blue-300 font-medium">
            Terakhir diperbarui: 17 Oktober 2026 &bull; Berlaku untuk seluruh pengguna situs, portal pelanggan, dan layanan NARA AC
          </p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10 space-y-10 text-slate-700 leading-relaxed">
          
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                1
              </div>
              <h2 className="text-xl font-bold tracking-tight">Pendahuluan &amp; Identitas Pengendali Data</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 pl-11">
              Selamat datang di <strong>NARA AC</strong>, sistem pengelolaan jadwal dan pengingat servis pendingin ruangan (AC) yang dikelola secara resmi oleh <strong>CV. Nara Teknindotama</strong> (NIB: <code>2805250066735</code>, NPWP: <code>10.000.000.0-258.288</code>, Akta Pendirian No. 07 Tanggal 09 Mei 2025, AHU-0045403-AH.01.14 Tahun 2025). Kami berkomitmen penuh melindungi privasi dan keamanan data pribadi Anda sesuai dengan <strong>Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                2
              </div>
              <h2 className="text-xl font-bold tracking-tight">Data Pribadi yang Kami Kumpulkan</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>Kami hanya mengumpulkan data pribadi yang relevan dan diperlukan untuk pelaksanaan layanan servis AC:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Data Identitas &amp; Akun Member:</strong> Nama lengkap, nomor telepon/WhatsApp aktif, alamat email, dan kata sandi terenkripsi (hash bcrypt) bagi pelanggan yang mendaftar keanggotaan (membership).
                </li>
                <li>
                  <strong>Data Alamat &amp; Lokasi Kunjungan:</strong> Alamat lengkap rumah/gedung/kantor, patokan lokasi, kelurahan/kecamatan, dan kota/kabupaten untuk penugasan teknisi lapangan.
                </li>
                <li>
                  <strong>Inventaris Unit AC &amp; Riwayat Teknis:</strong> Identitas per unit AC (merk, model, kapasitas PK, lokasi ruangan, tanggal pemasangan), foto kondisi unit sebelum &amp; sesudah pengerjaan, checklist SOP, diagnosis teknisi, serta pemakaian suku cadang.
                </li>
                <li>
                  <strong>Data Transaksi, Invoice &amp; Bukti Pembayaran:</strong> Rincian estimasi biaya, diskon membership, invoice awal &amp; final, skema/metode pembayaran, serta berkas/tautan bukti transfer bank yang diunggah untuk verifikasi manual Admin. Kami <em>tidak mengumpulkan atau menyimpan</em> nomor kartu kredit/debit maupun PIN perbankan Anda.
                </li>
                <li>
                  <strong>Data Percakapan Layanan Pelanggan:</strong> Pesan yang dikirimkan melalui fitur Chatbot web atau WhatsApp CS Resmi guna menjawab pertanyaan layanan, cek jadwal, dan eskalasi tiket bantuan ke Admin.
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                3
              </div>
              <h2 className="text-xl font-bold tracking-tight">Tujuan Pemrosesan Data &amp; Persetujuan WhatsApp</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>Data yang dikumpulkan digunakan secara terbatas untuk tujuan operasional berikut:</p>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Eksekusi Kunjungan &amp; Laporan Servis</h3>
                  <p className="text-xs text-slate-600 mt-1">Menjadwalkan teknisi resmi, memvalidasi SOP pengerjaan (foto before-after &amp; checklist), serta mencatat riwayat kesehatan tiap unit AC.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Pengiriman Invoice &amp; Verifikasi</h3>
                  <p className="text-xs text-slate-600 mt-1">Mengirimkan Invoice Awal dan Invoice Final melalui WhatsApp, memverifikasi bukti pembayaran transfer, dan memproses pengembalian kelebihan bayar (refund).</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Pengingat Jadwal H-1 &amp; Perawatan Berkala</h3>
                  <p className="text-xs text-slate-600 mt-1">Mengirimkan pengingat kunjungan H-1 serta pengingat perawatan cuci AC berkala melalui WhatsApp berdasarkan tanggal servis selesai terakhir pada unit AC Anda.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Validasi Garansi 14 / 30 / 45 Hari</h3>
                  <p className="text-xs text-slate-600 mt-1">Memverifikasi masa berlaku garansi layanan, memproses klaim garansi, serta menjadwalkan kunjungan pemeriksaan gratis oleh teknisi.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                4
              </div>
              <h2 className="text-xl font-bold tracking-tight">Keamanan Data, Penyamaran PII &amp; Pemisahan Data Analitik</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>
                NARA AC menerapkan langkah pengamanan teknis dan organisasi berlapis:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Penyamaran Data pada Lacak Publik (Data Masking):</strong> Pada halaman lacak status publik berdasarkan kode booking, nama lengkap, nomor telepon, dan alamat pelanggan disamarkan secara otomatis (contoh: <code>0812••••7890</code>, <code>[Alamat Disamarkan]</code>). Tindakan sensitif seperti pembatalan, reschedule, unggah bukti bayar, dan klaim garansi mewajibkan autentikasi akun atau verifikasi nomor WhatsApp pemesan.
                </li>
                <li>
                  <strong>Kontrol Akses Berbasis Peran (RBAC):</strong> Pelanggan hanya dapat mengakses data miliknya sendiri; teknisi hanya dapat mengakses rincian pekerjaan yang ditugaskan kepadanya; dan verifikasi keuangan serta keputusan garansi dibatasi khusus untuk Admin berwenang.
                </li>
                <li>
                  <strong>Tokenisasi &amp; Anonimisasi Dataset Analitik (Data Science Governance):</strong> Untuk keperluan peramalan permintaan (demand forecasting) dan evaluasi operasional internal, pengenal langsung seperti nomor telepon, nama lengkap, dan alamat rumah dihapus atau ditokenisasi menggunakan fungsi kriptografi satu arah (SHA-256) sehingga tidak pernah diekspos ke publik maupun ke model analitik.
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                5
              </div>
              <h2 className="text-xl font-bold tracking-tight">Pemroses Pihak Ketiga &amp; Layanan AI</h2>
            </div>
            <div className="pl-11 space-y-2 text-sm sm:text-base text-slate-600">
              <p>
                <strong>Kami tidak pernah menjual atau memperdagangkan data pribadi Anda kepada pihak ketiga.</strong> Dalam menyelenggarakan layanan, sistem dapat berinteraksi secara terbatas dengan komponen pendukung berikut:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Penyedia Gateway WhatsApp (Fonnte / Wablas / WhatsApp Business API):</strong> Digunakan khusus untuk mengirimkan pesan pengingat H-1, pengingat perawatan berkala, salinan invoice, serta merespons pesan pelanggan.</li>
                <li><strong>Layanan Asisten AI &amp; Klasifikasi Intent:</strong> Memproses teks pertanyaan pelanggan untuk mengidentifikasi kebutuhan layanan atau mengecek ketersediaan jadwal tanpa menyimpan atau membagikan data keuangan pribadi kepada pihak eksternal yang tidak berwenang.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                6
              </div>
              <h2 className="text-xl font-bold tracking-tight">Retensi Data &amp; Hak-Hak Subjek Data Pribadi</h2>
            </div>
            <div className="pl-11 space-y-2 text-sm sm:text-base text-slate-600">
              <p>
                Data riwayat servis dan transaksi disimpan selama akun Anda aktif atau sepanjang diperlukan untuk pemenuhan kewajiban garansi, pembukuan keuangan/perpajakan CV. Nara Teknindotama, serta kepatuhan hukum. Sesuai UU PDP, Anda berhak untuk:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Mengakses dan memperoleh salinan riwayat servis per unit AC serta invoice Anda melalui Portal Pelanggan.</li>
                <li>Memperbarui profil, alamat utama, atau nomor kontak WhatsApp Anda kapan saja.</li>
                <li>Menarik persetujuan pengiriman pengingat perawatan berkala otomatis melalui WhatsApp.</li>
                <li>Mengajukan permohonan penonaktifan atau penghapusan akun melalui kanal resmi kami, sepanjang tidak terdapat kewajiban tagihan atau sengketa transaksi yang masih berjalan.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3 bg-blue-50/60 border border-blue-200/80 p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-blue-900">
              <Building2 className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-bold">Kontak Resmi &amp; Pengaduan Privasi Data</h2>
            </div>
            <p className="text-sm text-slate-600">
              Untuk pertanyaan, permintaan akses/perbaikan data, atau pengaduan terkait pelindungan data pribadi, silakan hubungi kami melalui saluran resmi CV. Nara Teknindotama:
            </p>
            <div className="pt-2 space-y-2 text-sm text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>CV. Nara Teknindotama (NIB: 2805250066735 &bull; AHU-0045403-AH.01.14 Tahun 2025)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <a href="mailto:narateknindotama@gmail.com" className="text-blue-600 underline hover:text-blue-700">narateknindotama@gmail.com</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <a href="https://wa.me/6281385293137" target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                  WhatsApp / Telepon Resmi: 0813-8529-3137
                </a>
              </div>
              <div className="text-xs text-slate-500 pt-1">
                Alamat Kantor: Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat.
              </div>
            </div>
          </section>

        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-3 font-medium">
            <Link to="/terms" className="hover:text-blue-600 transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <span className="text-slate-300">&bull;</span>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
