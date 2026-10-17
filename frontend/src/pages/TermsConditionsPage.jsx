import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck, Phone, Building2, AlertCircle, Bot, CreditCard, Wrench } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Navbar Header */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <CompanyLogo dark={false} iconSize="h-9 sm:h-10" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-blue-950 text-white py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-600/30 border border-blue-400/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-200 backdrop-blur-sm">
            <FileText className="w-4 h-4 text-blue-300" />
            <span>Perjanjian Layanan, Harga, Pembayaran &amp; Ketentuan Garansi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            Syarat &amp; Ketentuan Layanan
          </h1>
          <p className="text-slate-200 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Pedoman hak, kewajiban, keanggotaan (membership), penjadwalan, pembayaran, laporan kerja teknisi, serta ketentuan garansi resmi pengerjaan servis AC oleh CV. Nara Teknindotama.
          </p>
          <p className="text-xs text-slate-400 font-medium">
            Terakhir diperbarui: 17 Oktober 2026 &bull; Berlaku untuk seluruh pelanggan residensial dan korporat (B2B) NARA AC
          </p>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10 space-y-10 text-slate-700 leading-relaxed">

          {/* Section 1: Identitas Badan Usaha & Ruang Lingkup */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                1
              </div>
              <h2 className="text-xl font-bold tracking-tight">Identitas Badan Usaha &amp; Ruang Lingkup Layanan</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>
                Platform digital <strong>NARA AC</strong> dioperasikan secara resmi oleh <strong>CV. Nara Teknindotama</strong>, perusahaan layanan teknis perawatan pendingin udara (AC), instalasi, pengadaan unit, serta distribusi suku cadang yang berkedudukan di Kabupaten Bogor, Jawa Barat.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm space-y-1">
                <p><strong>Nama Badan Hukum:</strong> CV. Nara Teknindotama</p>
                <p><strong>Nomor Induk Berusaha (NIB):</strong> 2805250066735</p>
                <p><strong>NPWP:</strong> 10.000.000.0-258.288</p>
                <p><strong>Akta Pendirian:</strong> Nomor 07 Tanggal 09 Mei 2025 (Notaris Ilyas, S.H.)</p>
                <p><strong> Pengesahan AHU:</strong> AHU-0045403-AH.01.14 Tahun 2025</p>
                <p><strong>Alamat Kantor:</strong> Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat</p>
                <p><strong>Kontak Resmi:</strong> 0813-8529-3137 &bull; <a href="mailto:narateknindotama@gmail.com" className="text-blue-600 underline">narateknindotama@gmail.com</a> &bull; www.narateknindotama.com</p>
              </div>
              <p>
                Ruang lingkup layanan mencakup pencucian AC (Indoor &amp; Outdoor), pengecekan temperatur &amp; kelistrikan, bongkar/pasang AC lama maupun baru, pengisian dan penambahan freon (R22, R32, R410A), flushing, vacuum, pengelasan titik, hingga penggantian komponen untuk pelanggan rumah tangga maupun korporat/industri.
              </p>
            </div>
          </section>

          {/* Section 2: Akun Pelanggan, Membership & Ketentuan Diskon */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                2
              </div>
              <h2 className="text-xl font-bold tracking-tight">Akun Pelanggan, Membership &amp; Kebijakan Harga (BR-01 s/d BR-05)</h2>
            </div>
            <div className="pl-11 space-y-2 text-sm sm:text-base text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Pendaftaran Akun Member (BR-01):</strong> Pelanggan lama maupun baru wajib membuat dan mengaktifkan akun pada portal NARA AC untuk memperoleh status keanggotaan (Membership).
                </li>
                <li>
                  <strong>Diskon Member 10% Khusus Biaya Jasa (BR-02 &amp; BR-03):</strong> Anggota terdaftar berhak memperoleh potongan harga sebesar <strong>10% yang berlaku khusus untuk biaya jasa layanan</strong>. Biaya penggantian suku cadang (spare part) dan material tambahan <strong>tidak termasuk</strong> dalam potongan diskon membership.
                </li>
                <li>
                  <strong>Perubahan Biaya Jasa Wajib Persetujuan Ganda (BR-04):</strong> Apabila kondisi aktual di lapangan membutuhkan penyesuaian biaya jasa di luar estimasi awal, perubahan biaya jasa tersebut wajib mendapatkan persetujuan dari <strong>Pelanggan dan Admin NARA AC</strong> sebelum ditagihkan pada invoice final.
                </li>
                <li>
                  <strong>Kesepakatan Suku Cadang di Lokasi (BR-05):</strong> Penambahan atau penggantian suku cadang (spare part) beserta rincian harganya disepakati secara langsung dan transparan antara Teknisi dan Pelanggan di lokasi pengerjaan, lalu dicatat secara resmi ke dalam laporan kerja dan invoice final.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Pemesanan, Penjadwalan, Pembatalan 24 Jam & Reschedule */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                3
              </div>
              <h2 className="text-xl font-bold tracking-tight">Pemesanan, Penjadwalan, Pembatalan &amp; Reschedule (BR-06 s/d BR-13)</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Konfirmasi Jadwal &amp; Anti-Bentrok (BR-06, BR-07):</strong> Pemesanan dikonfirmasi secara otomatis apabila slot waktu yang diminta tersedia dan seluruh data wajib terpenuhi. Sistem menolak pemesanan yang bentrok dengan kapasitas jadwal operasional.
                </li>
                <li>
                  <strong>Batas Waktu Pembatalan Minimal 24 Jam (BR-08):</strong> Pembatalan pesanan mandiri oleh pelanggan wajib dilakukan <strong>paling lambat 24 jam sebelum jadwal kunjungan</strong> yang telah ditentukan. Untuk pembatalan kurang dari 24 jam atau kondisi darurat, pelanggan wajib menghubungi Admin melalui WhatsApp resmi.
                </li>
                <li>
                  <strong>Perubahan Jadwal / Reschedule (BR-09):</strong> Pelanggan dapat mengajukan perubahan jadwal (reschedule) selama slot waktu pengganti masih tersedia pada sistem operasional kami.
                </li>
                <li>
                  <strong>Penugasan &amp; Penggantian Teknisi (BR-10, BR-11, BR-12):</strong> Admin menugaskan teknisi yang kompeten untuk setiap pesanan. Apabila teknisi berhalangan, Admin akan menunjuk teknisi pengganti atau menawarkan opsi slot jadwal alternatif kepada pelanggan.
                </li>
                <li>
                  <strong>Ketidakhadiran Pelanggan di Lokasi (BR-13):</strong> Apabila pelanggan tidak berada di lokasi atau tidak dapat dihubungi saat teknisi tiba sesuai jadwal, teknisi akan menunggu sesuai batas waktu operasional yang terkonfigurasi dan melaporkan status penundaan (delayed) kepada Admin untuk penjadwalan ulang.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4: Kunjungan Teknisi, Laporan Kerja & Konfirmasi Penyelesaian */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                4
              </div>
              <h2 className="text-xl font-bold tracking-tight">Laporan Kerja Teknisi, Konfirmasi Selesai &amp; Ulasan (BR-14, BR-18 s/d BR-22)</h2>
            </div>
            <div className="pl-11 space-y-2 text-sm sm:text-base text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Standar Laporan Servis (BR-18, BR-19, BR-20):</strong> Untuk setiap pekerjaan, teknisi wajib mencatat diagnosis/catatan kerja, daftar periksa (checklist) SOP, rincian suku cadang yang digunakan, serta mengunggah dokumentasi foto kondisi unit <strong>sebelum (before)</strong> dan <strong>sesudah (after)</strong> pengerjaan.
                </li>
                <li>
                  <strong>Konfirmasi Penyelesaian &amp; Otomatisasi 48 Jam (BR-14, BR-21):</strong> Setelah teknisi menyelesaikan pekerjaan di sistem, pelanggan dapat melakukan konfirmasi penyelesaian melalui halaman Lacak Status atau Portal Pelanggan. Apabila dalam waktu <strong>48 jam</strong> setelah pekerjaan ditandai selesai tidak terdapat sanggahan atau komplain dari pelanggan, pesanan akan terkonfirmasi selesai secara otomatis oleh sistem.
                </li>
                <li>
                  <strong>Ulasan Pelanggan (BR-22):</strong> Pelanggan dapat memberikan penilaian bintang (rating 1–5) dan ulasan tertulis setelah pekerjaan selesai dan terkonfirmasi.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5: Invoice, Skema Pembayaran, Verifikasi & Refund */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                5
              </div>
              <h2 className="text-xl font-bold tracking-tight">Estimasi, Invoice Final, Pembayaran &amp; Refund (BR-34 s/d BR-43)</h2>
            </div>
            <div className="pl-11 space-y-2 text-sm sm:text-base text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Skema &amp; Metode Pembayaran (BR-34, BR-35, BR-36):</strong> Pelanggan dapat memilih skema pembayaran yang diaktifkan oleh Admin (Bayar Penuh di Awal, DP 50%, atau Bayar Setelah Selesai) melalui metode Transfer Bank Resmi (BCA/Mandiri atas nama CV Nara Teknindotama), QRIS, atau Tunai.
                </li>
                <li>
                  <strong>Verifikasi Manual Bukti Transfer (BR-37, BR-38):</strong> Pembayaran melalui transfer bank wajib disertai unggahan bukti bayar dan baru dinyatakan lunas (verified) setelah diverifikasi secara manual oleh Admin. Pesanan yang belum lunas tetap tercatat aktif dengan status pembayaran <em>pending/unpaid</em>.
                </li>
                <li>
                  <strong>Invoice Awal vs. Invoice Final (BR-39):</strong> Sistem menerbitkan <em>Invoice Awal (Estimasi)</em> saat pemesanan dibuat dan menerbitkan <em>Invoice Final</em> setelah pekerjaan lapangan selesai beserta rincian aktual suku cadang. Salinan invoice dikirimkan secara otomatis melalui WhatsApp pelanggan (BR-42, BR-43).
                </li>
                <li>
                  <strong>Kekurangan &amp; Kelebihan Pembayaran (BR-40, BR-41):</strong> Apabila nilai Invoice Final lebih besar dari jumlah yang telah dibayarkan (kurang bayar), selisihnya tercatat sebagai sisa tagihan yang wajib dilunasi pelanggan. Apabila jumlah yang telah dibayarkan melebihi nilai Invoice Final (lebih bayar), selisih kelebihan bayar akan dikembalikan (refund) oleh Admin disertai pencatatan bukti pengembalian dana.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6: Kebijakan Garansi */}
          <section className="space-y-4 bg-emerald-50/70 border border-emerald-200/80 p-6 sm:p-8 rounded-3xl">
            <div className="flex items-center gap-3 text-emerald-950">
              <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0" />
              <div>
                <h2 className="text-xl font-bold tracking-tight">Ketentuan Garansi Resmi NARA AC (BR-23 s/d BR-33)</h2>
                <p className="text-xs text-emerald-700 font-medium">Masa garansi terkonfigurasi per layanan dan dihitung sejak tanggal pekerjaan selesai</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white border border-emerald-200 p-4 rounded-2xl shadow-xs">
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full mb-2">
                  14 HARI KALENDER
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Cuci AC Reguler / Standar</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Menjamin kendala tetesan air (water leak) pada saluran drainase atau getaran tidak wajar pasca pencucian reguler.
                </p>
              </div>

              <div className="bg-white border border-emerald-200 p-4 rounded-2xl shadow-xs">
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full mb-2">
                  30 HARI KALENDER
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Cuci Core, Bongkar Pasang &amp; Perbaikan</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Meliputi layanan Cuci AC Core (Deep Clean), instalasi/bongkar pasang, pengisian freon, dan penggantian suku cadang.
                </p>
              </div>

              <div className="bg-white border border-emerald-200 p-4 rounded-2xl shadow-xs">
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full mb-2">
                  45 HARI KALENDER
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Paket Lengkap Core + Freon</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Perlindungan garansi terpanjang untuk paket perawatan menyeluruh Deep Clean Core beserta pengisian freon penuh.
                </p>
              </div>
            </div>

            <div className="pt-2 text-xs sm:text-sm text-slate-700 space-y-2">
              <p className="font-bold text-slate-900">Prosedur &amp; Ketentuan Klaim Garansi:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Syarat Pengajuan (BR-24, BR-25):</strong> Garansi aktif sejak pekerjaan berstatus selesai (<em>done</em>). Pengajuan klaim wajib menyertakan deskripsi keluhan serta penilaian (rating dan komentar review) atas layanan sebelumnya.</li>
                <li><strong>Kunjungan Pemeriksaan Gratis (BR-26, BR-27, BR-28):</strong> Admin menjadwalkan kunjungan pemeriksaan klaim oleh teknisi. <strong>Kunjungan pemeriksaan garansi tidak dipungut biaya (gratis)</strong>, meskipun hasil pemeriksaan menunjukkan klaim ditolak karena penyebab di luar cakupan garansi.</li>
                <li><strong>Persetujuan Biaya Tambahan di Luar Garansi (BR-29, BR-32):</strong> Jika ditemukan kerusakan komponen baru atau kebutuhan suku cadang di luar cakupan garansi awal, biaya tambahan wajib mendapatkan persetujuan terpisah, atau klaim yang ditolak dapat dilanjutkan menjadi pesanan servis berbayar baru atas persetujuan pelanggan.</li>
                <li><strong>Satu Klaim Aktif &amp; Masalah Berbeda (BR-30, BR-31):</strong> Hanya diperkenankan <strong>1 (satu) klaim garansi aktif</strong> pada satu waktu untuk setiap pesanan. Klaim berikutnya dalam masa garansi hanya dapat diajukan untuk keluhan/masalah teknis yang berbeda.</li>
                <li><strong>Pengecualian Garansi (BR-33):</strong> Garansi gugur apabila unit telah dibongkar oleh pihak ketiga selain teknisi resmi NARA AC, terjadi gangguan/lonjakan arus listrik PLN, bencana alam, atau kerusakan kompresor/modul elektronik yang tidak berkaitan dengan tindakan servis sebelumnya.</li>
              </ul>
            </div>
          </section>

          {/* Section 7: Notifikasi WhatsApp & Asisten AI */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                7
              </div>
              <h2 className="text-xl font-bold tracking-tight">Notifikasi WhatsApp, Pengingat Berkala &amp; Asisten AI (BR-15 s/d BR-17, BR-44 s/d BR-47)</h2>
            </div>
            <div className="pl-11 space-y-2 text-sm sm:text-base text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Pengiriman Invoice &amp; Pengingat Perawatan via WhatsApp (BR-16, BR-17, BR-42, BR-47):</strong> Dengan memesan layanan NARA AC, Anda menyetujui pengiriman notifikasi operasional, pengingat jadwal H-1, pengingat perawatan berkala per unit AC (dihitung hanya dari riwayat servis yang selesai, tidak termasuk pesanan batal), serta pengiriman tautan invoice melalui WhatsApp.
                </li>
                <li>
                  <strong>Keterbatasan Asisten Pelanggan AI (BR-44, BR-45, BR-46):</strong> Fitur Chatbot dan WhatsApp AI NARA AC disediakan untuk membantu menjelaskan katalog layanan, memeriksa ketersediaan slot jadwal dari basis data, serta meneruskan percakapan ke Admin manusia (<em>human handoff</em>). Jawaban AI bersifat informatif; konfirmasi pemesanan, verifikasi pembayaran, dan keputusan klaim garansi hanya sah apabila telah tercatat secara otoritatif pada sistem transaksi NARA AC.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 8: Hukum yang Berlaku & Catatan Tinjauan Hukum */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                8
              </div>
              <h2 className="text-xl font-bold tracking-tight">Hukum yang Berlaku, Penyelesaian Sengketa &amp; Pemberitahuan</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>
                Syarat dan Ketentuan ini diatur dan ditafsirkan berdasarkan hukum Negara Kesatuan Republik Indonesia. Setiap perselisihan akan diselesaikan secara musyawarah untuk mufakat melalui kanal layanan pelanggan resmi CV. Nara Teknindotama.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Catatan Kepatuhan Operasional &amp; Tinjauan Hukum:</span>
                </p>
                <p>
                  Dokumen ini menyelaraskan ketentuan teknis aplikasi dengan <em>Business Rules Specification NARA AC (A26-CS054)</em> dan profil resmi CV. Nara Teknindotama. Kebijakan operasional lanjutan seperti denda pembatalan kurang dari 24 jam, batas waktu maksimum pelunasan invoice tertunggak, dan prosedur refund tunai mengikuti ketetapan manajemen CV. Nara Teknindotama yang dikonfirmasi bersama pelanggan sebelum eksekusi.
                </p>
              </div>
            </div>
          </section>

          {/* Kontak Dukungan Pelanggan */}
          <section className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Punya Pertanyaan Mengenai Ketentuan Ini?</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Tim layanan pelanggan CV. Nara Teknindotama siap melayani konsultasi Anda (Hotline WhatsApp: 0813-8529-3137).
              </p>
            </div>
            <a
              href="https://wa.me/6281385293137?text=Halo%20Admin%20NARA%20AC,%20saya%20ingin%20bertanya%20mengenai%20syarat%20dan%20ketentuan%20layanan."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0 shadow-sm"
            >
              <Phone className="w-4 h-4" />
              <span>Hubungi 0813-8529-3137</span>
            </a>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>&copy; {new Date().getFullYear()} CV. Nara Teknindotama (NIB: 2805250066735). Seluruh hak cipta dilindungi.</p>
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
