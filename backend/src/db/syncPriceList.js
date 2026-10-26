const { pool } = require('./pool');

const SERVICES_CATALOG = [
  // ==========================================
  // UKURAN AC 0,5PK - 1PK : CUCI
  // ==========================================
  // RUMAH
  {
    id: 1, // preserve ID 1
    kode: 'SRV-CUCI-01',
    nama_layanan: 'Cuci Biasa (0.5PK - 1PK) - Rumah',
    kategori: 'cuci',
    harga: 75000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan standar filter, evaporator indoor, kondensor outdoor, dan cek tekanan freon untuk rumah tinggal (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-RMH-FOAM',
    nama_layanan: 'Cuci Foam / Sabun (0.5PK - 1PK) - Rumah',
    kategori: 'cuci',
    harga: 115000,
    durasi_menit: 75,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pencucian intensif menggunakan chemical foam/sabun pembersih kerak evaporator & sterilisasi anti jamur (0.5PK - 1PK).'
  },
  {
    id: 4, // preserve ID 4
    kode: 'SRV-CUCI-CORE',
    nama_layanan: 'Cuci Semi Overhaul (0.5PK - 1PK) - Rumah',
    kategori: 'cuci',
    harga: 200000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan mendalam dengan pelepasan talang air dan fan blower untuk menuntaskan kebocoran dan bau apek (0.5PK - 1PK).'
  },
  {
    id: 5, // preserve ID 5
    kode: 'SRV-CUCI-FREON',
    nama_layanan: 'Cuci Overhaul (0.5PK - 1PK) - Rumah',
    kategori: 'cuci',
    harga: 350000,
    durasi_menit: 120,
    garansi_hari: 45,
    interval_maintenance_hari: 120,
    deskripsi: 'Bongkar total seluruh unit indoor dan perendaman chemical wash evaporator untuk performa dingin maksimal seperti baru (0.5PK - 1PK).'
  },

  // KANTOR / PERUSAHAAN
  {
    kode: 'SRV-CUCI-051-KTR-BIASA',
    nama_layanan: 'Cuci Biasa (0.5PK - 1PK) - Kantor / Perusahaan',
    kategori: 'cuci',
    harga: 95000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan standar filter & evaporator AC kantor/perusahaan komersial (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-KTR-FOAM',
    nama_layanan: 'Cuci Foam / Sabun (0.5PK - 1PK) - Kantor / Perusahaan',
    kategori: 'cuci',
    harga: 150000,
    durasi_menit: 75,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pencucian menggunakan foaming agent khusus AC kantor dengan intensitas pemakaian tinggi (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-KTR-SEMIOH',
    nama_layanan: 'Cuci Semi Overhaul (0.5PK - 1PK) - Kantor / Perusahaan',
    kategori: 'cuci',
    harga: 250000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Cuci semi overhaul talang air & blower rotor untuk AC area kantor/perusahaan (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-KTR-OH',
    nama_layanan: 'Cuci Overhaul (0.5PK - 1PK) - Kantor / Perusahaan',
    kategori: 'cuci',
    harga: 450000,
    durasi_menit: 120,
    garansi_hari: 45,
    interval_maintenance_hari: 120,
    deskripsi: 'Overhaul bongkar total indoor AC kantor/perusahaan, chemical wash menyeluruh (0.5PK - 1PK).'
  },

  // APARTEMEN
  {
    kode: 'SRV-CUCI-051-APT-BIASA',
    nama_layanan: 'Cuci Biasa (0.5PK - 1PK) - Apartemen',
    kategori: 'cuci',
    harga: 110000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan standar AC apartemen dengan SOP proteksi interior ruangan (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-APT-FOAM',
    nama_layanan: 'Cuci Foam / Sabun (0.5PK - 1PK) - Apartemen',
    kategori: 'cuci',
    harga: 130000,
    durasi_menit: 75,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pencucian busa pembersih bakteri & jamur unit AC unit hunian apartemen (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-APT-SEMIOH',
    nama_layanan: 'Cuci Semi Overhaul (0.5PK - 1PK) - Apartemen',
    kategori: 'cuci',
    harga: 220000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Semi overhaul talang air & fan indoor AC apartemen, anti tetesan air ke dinding (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-APT-OH',
    nama_layanan: 'Cuci Overhaul (0.5PK - 1PK) - Apartemen',
    kategori: 'cuci',
    harga: 400000,
    durasi_menit: 120,
    garansi_hari: 45,
    interval_maintenance_hari: 120,
    deskripsi: 'Overhaul unit AC apartemen dengan pencucian chemical wash tuntas (0.5PK - 1PK).'
  },

  // PERUSAHAAN (Layanan Khusus Pabrik / Corporate Site)
  {
    kode: 'SRV-CUCI-051-PRS-BIASA',
    nama_layanan: 'Cuci Biasa (0.5PK - 1PK) - Gedung / Korporasi',
    kategori: 'cuci',
    harga: 120000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan rutin standar unit AC gedung komersial / korporasi (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-PRS-FOAM',
    nama_layanan: 'Cuci Foam / Sabun (0.5PK - 1PK) - Gedung / Korporasi',
    kategori: 'cuci',
    harga: 150000,
    durasi_menit: 75,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Cuci sabun/foam khusus untuk unit AC gedung korporasi dengan heavy duty usage (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-PRS-SEMIOH',
    nama_layanan: 'Cuci Semi Overhaul (0.5PK - 1PK) - Gedung / Korporasi',
    kategori: 'cuci',
    harga: 250000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Semi overhaul talang & rotor fan AC korporasi / gedung komersial (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-CUCI-051-PRS-OH',
    nama_layanan: 'Cuci Overhaul (0.5PK - 1PK) - Gedung / Korporasi',
    kategori: 'cuci',
    harga: 450000,
    durasi_menit: 120,
    garansi_hari: 45,
    interval_maintenance_hari: 120,
    deskripsi: 'Overhaul cuci total unit AC korporasi / gedung komersial (0.5PK - 1PK).'
  },

  // ==========================================
  // UKURAN AC 0,5PK - 1PK : FREON
  // ==========================================
  {
    kode: 'SRV-FREON-051-R32-10PSI',
    nama_layanan: 'Tambah Freon R32 / 10 PSI (0.5PK - 1PK)',
    kategori: 'perbaikan',
    harga: 45000,
    durasi_menit: 30,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Penambahan refrigeran R32 per 10 PSI untuk AC ukuran 0.5PK sampai 1PK.'
  },
  {
    id: 3, // preserve ID 3
    kode: 'SRV-FREON-01',
    nama_layanan: 'Isi Ulang Freon R32 / 150 PSI (0.5PK - 1PK)',
    kategori: 'perbaikan',
    harga: 500000,
    durasi_menit: 60,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengisian ulang freon R32 dari kosong (0 PSI) hingga tekanan penuh standar pabrikan 150 PSI (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-FREON-051-R410-10PSI',
    nama_layanan: 'Tambah Freon R410A / 10 PSI (0.5PK - 1PK)',
    kategori: 'perbaikan',
    harga: 45000,
    durasi_menit: 30,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Penambahan refrigeran ramah lingkungan R410A per 10 PSI untuk AC 0.5PK - 1PK.'
  },
  {
    kode: 'SRV-FREON-051-R410-150PSI',
    nama_layanan: 'Isi Ulang Freon R410A / 150 PSI (0.5PK - 1PK)',
    kategori: 'perbaikan',
    harga: 500000,
    durasi_menit: 60,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengisian ulang freon R410A murni total hingga 150 PSI untuk AC ukuran 0.5PK - 1PK.'
  },
  {
    kode: 'SRV-FREON-051-R22-10PSI',
    nama_layanan: 'Tambah Freon R22 / 10 PSI (0.5PK - 1PK)',
    kategori: 'perbaikan',
    harga: 40000,
    durasi_menit: 30,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Penambahan refrigeran R22 per 10 PSI untuk unit AC model lama 0.5PK - 1PK.'
  },
  {
    kode: 'SRV-FREON-051-R22-150PSI',
    nama_layanan: 'Isi Ulang Freon R22 / 150 PSI (0.5PK - 1PK)',
    kategori: 'perbaikan',
    harga: 450000,
    durasi_menit: 60,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengisian ulang komplit refrigeran R22 kapasitas penuh untuk AC 0.5PK - 1PK.'
  },

  // ==========================================
  // UKURAN AC 0,5PK - 1PK : PASANG & BONGKAR
  // ==========================================
  {
    kode: 'SRV-INST-051-RMH-PASANG',
    nama_layanan: 'Pasang AC (0.5PK - 1PK) - Rumah',
    kategori: 'instalasi',
    harga: 300000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 180,
    deskripsi: 'Jasa pemasangan unit AC baru/bekas di rumah, termasuk proses vakum dan pengetesan pipa (0.5PK - 1PK).'
  },
  {
    id: 2, // preserve ID 2
    kode: 'SRV-BONGKAR-01',
    nama_layanan: 'Bongkar AC (0.5PK - 1PK) - Rumah',
    kategori: 'instalasi',
    harga: 150000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Jasa pembongkaran unit AC indoor & outdoor rumah dengan pump down freon aman (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-INST-051-KTR-PASANG',
    nama_layanan: 'Pasang AC (0.5PK - 1PK) - Kantor / Perusahaan',
    kategori: 'instalasi',
    harga: 350000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 180,
    deskripsi: 'Instalasi pemasangan unit AC di area kantor/perusahaan sesuai standar K3 (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-INST-051-KTR-BONGKAR',
    nama_layanan: 'Bongkar AC (0.5PK - 1PK) - Kantor / Perusahaan',
    kategori: 'instalasi',
    harga: 200000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Jasa bongkar unit AC kantor/perusahaan dengan penguncian freon pump down (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-INST-051-APT-PASANG',
    nama_layanan: 'Pasang AC (0.5PK - 1PK) - Apartemen',
    kategori: 'instalasi',
    harga: 350000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 180,
    deskripsi: 'Instalasi unit AC di apartemen dengan izin kerja gedung dan vakum pipa instalasi (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-INST-051-APT-BONGKAR',
    nama_layanan: 'Bongkar AC (0.5PK - 1PK) - Apartemen',
    kategori: 'instalasi',
    harga: 200000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Bongkar unit AC di apartemen rapi dan aman tanpa merusak wallpaper atau plafon (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-INST-051-PRS-PASANG',
    nama_layanan: 'Pasang AC (0.5PK - 1PK) - Gedung / Korporasi',
    kategori: 'instalasi',
    harga: 350000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 180,
    deskripsi: 'Pemasangan AC di gedung korporasi komersial (0.5PK - 1PK).'
  },
  {
    kode: 'SRV-INST-051-PRS-BONGKAR',
    nama_layanan: 'Bongkar AC (0.5PK - 1PK) - Gedung / Korporasi',
    kategori: 'instalasi',
    harga: 150000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Pelepasan unit AC gedung korporasi komersial (0.5PK - 1PK).'
  },

  // ==========================================
  // UKURAN AC 1,5PK - 2PK : CUCI
  // ==========================================
  // RUMAH
  {
    kode: 'SRV-CUCI-152-RMH-BIASA',
    nama_layanan: 'Cuci Biasa (1.5PK - 2PK) - Rumah',
    kategori: 'cuci',
    harga: 100000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan standar filter, evaporator, blower, dan kondensor untuk unit AC besar 1.5PK - 2PK di rumah.'
  },
  {
    kode: 'SRV-CUCI-152-RMH-FOAM',
    nama_layanan: 'Cuci Foam / Sabun (1.5PK - 2PK) - Rumah',
    kategori: 'cuci',
    harga: 150000,
    durasi_menit: 75,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Cuci foam/sabun kimia pembersih khusus kerak dan jamur membandel AC 1.5PK - 2PK di rumah.'
  },
  {
    kode: 'SRV-CUCI-152-RMH-SEMIOH',
    nama_layanan: 'Cuci Semi Overhaul (1.5PK - 2PK) - Rumah',
    kategori: 'cuci',
    harga: 230000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Cuci semi overhaul talang air & blower indoor AC kapasitas 1.5PK - 2PK di rumah.'
  },
  {
    kode: 'SRV-CUCI-152-RMH-OH',
    nama_layanan: 'Cuci Overhaul (1.5PK - 2PK) - Rumah',
    kategori: 'cuci',
    harga: 400000,
    durasi_menit: 130,
    garansi_hari: 45,
    interval_maintenance_hari: 120,
    deskripsi: 'Bongkar total cuci overhaul kimia komprehensif AC 1.5PK - 2PK di rumah tinggal.'
  },

  // KANTOR / PERUSAHAAN
  {
    kode: 'SRV-CUCI-152-KTR-BIASA',
    nama_layanan: 'Cuci Biasa (1.5PK - 2PK) - Kantor / Perusahaan',
    kategori: 'cuci',
    harga: 120000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Cuci berkala standar AC kapasitas 1.5PK - 2PK pada area kantor / tempat usaha.'
  },
  {
    kode: 'SRV-CUCI-152-KTR-FOAM',
    nama_layanan: 'Cuci Foam / Sabun (1.5PK - 2PK) - Kantor / Perusahaan',
    kategori: 'cuci',
    harga: 150000,
    durasi_menit: 75,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pencucian busa pembersih bakteri AC kantor 1.5PK - 2PK dengan jam kerja aktif tinggi.'
  },
  {
    kode: 'SRV-CUCI-152-KTR-SEMIOH',
    nama_layanan: 'Cuci Semi Overhaul (1.5PK - 2PK) - Kantor / Perusahaan',
    kategori: 'cuci',
    harga: 250000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Semi overhaul talang air dan blower indoor unit AC 1.5PK - 2PK kantor / perusahaan.'
  },
  {
    kode: 'SRV-CUCI-152-KTR-OH',
    nama_layanan: 'Cuci Overhaul (1.5PK - 2PK) - Kantor / Perusahaan',
    kategori: 'cuci',
    harga: 450000,
    durasi_menit: 130,
    garansi_hari: 45,
    interval_maintenance_hari: 120,
    deskripsi: 'Overhaul cuci total chemical soak indoor unit AC 1.5PK - 2PK kantor / perusahaan.'
  },

  // APARTEMEN
  {
    kode: 'SRV-CUCI-152-APT-BIASA',
    nama_layanan: 'Cuci Biasa (1.5PK - 2PK) - Apartemen',
    kategori: 'cuci',
    harga: 135000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan AC 1.5PK - 2PK unit apartemen dengan SOP higienis dan terproteksi.'
  },
  {
    kode: 'SRV-CUCI-152-APT-FOAM',
    nama_layanan: 'Cuci Foam / Sabun (1.5PK - 2PK) - Apartemen',
    kategori: 'cuci',
    harga: 150000,
    durasi_menit: 75,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pencucian foam / sabun disinfektan untuk AC 1.5PK - 2PK di apartemen.'
  },
  {
    kode: 'SRV-CUCI-152-APT-SEMIOH',
    nama_layanan: 'Cuci Semi Overhaul (1.5PK - 2PK) - Apartemen',
    kategori: 'cuci',
    harga: 240000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Semi overhaul talang air dan kipas blower indoor AC 1.5PK - 2PK apartemen.'
  },
  {
    kode: 'SRV-CUCI-152-APT-OH',
    nama_layanan: 'Cuci Overhaul (1.5PK - 2PK) - Apartemen',
    kategori: 'cuci',
    harga: 450000,
    durasi_menit: 130,
    garansi_hari: 45,
    interval_maintenance_hari: 120,
    deskripsi: 'Overhaul tuntas pembersihan menyeluruh AC 1.5PK - 2PK unit apartemen.'
  },

  // PERUSAHAAN (Gedung / Korporasi)
  {
    kode: 'SRV-CUCI-152-PRS-BIASA',
    nama_layanan: 'Cuci Biasa (1.5PK - 2PK) - Gedung / Korporasi',
    kategori: 'cuci',
    harga: 150000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan standar AC komersial 1.5PK - 2PK di fasilitas korporasi / perusahaan.'
  },
  {
    kode: 'SRV-CUCI-152-PRS-FOAM',
    nama_layanan: 'Cuci Foam / Sabun (1.5PK - 2PK) - Gedung / Korporasi',
    kategori: 'cuci',
    harga: 170000,
    durasi_menit: 75,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pencucian foam sabun intensif AC 1.5PK - 2PK gedung perusahaan.'
  },
  {
    kode: 'SRV-CUCI-152-PRS-SEMIOH',
    nama_layanan: 'Cuci Semi Overhaul (1.5PK - 2PK) - Gedung / Korporasi',
    kategori: 'cuci',
    harga: 250000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Semi overhaul pelepasan talang drainase AC 1.5PK - 2PK gedung perusahaan.'
  },
  {
    kode: 'SRV-CUCI-152-PRS-OH',
    nama_layanan: 'Cuci Overhaul (1.5PK - 2PK) - Gedung / Korporasi',
    kategori: 'cuci',
    harga: 450000,
    durasi_menit: 130,
    garansi_hari: 45,
    interval_maintenance_hari: 120,
    deskripsi: 'Overhaul bongkar total indoor AC 1.5PK - 2PK gedung korporasi / perusahaan.'
  },

  // ==========================================
  // UKURAN AC 1,5PK - 2PK : FREON
  // ==========================================
  {
    kode: 'SRV-FREON-152-R32-10PSI',
    nama_layanan: 'Tambah Freon R32 / 10 PSI (1.5PK - 2PK)',
    kategori: 'perbaikan',
    harga: 65000,
    durasi_menit: 30,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Penambahan refrigeran R32 per 10 PSI untuk AC ukuran besar 1.5PK - 2PK.'
  },
  {
    kode: 'SRV-FREON-152-R32-150PSI',
    nama_layanan: 'Isi Ulang Freon R32 / 150 PSI (1.5PK - 2PK)',
    kategori: 'perbaikan',
    harga: 650000,
    durasi_menit: 60,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengisian ulang freon R32 penuh hingga 150 PSI untuk AC kapasitas 1.5PK - 2PK.'
  },
  {
    kode: 'SRV-FREON-152-R410-10PSI',
    nama_layanan: 'Tambah Freon R410A / 10 PSI (1.5PK - 2PK)',
    kategori: 'perbaikan',
    harga: 65000,
    durasi_menit: 30,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Penambahan gas freon R410A per 10 PSI untuk unit AC 1.5PK - 2PK.'
  },
  {
    kode: 'SRV-FREON-152-R410-150PSI',
    nama_layanan: 'Isi Ulang Freon R410A / 150 PSI (1.5PK - 2PK)',
    kategori: 'perbaikan',
    harga: 650000,
    durasi_menit: 60,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengisian ulang freon R410A penuh 150 PSI untuk unit AC 1.5PK - 2PK.'
  },
  {
    kode: 'SRV-FREON-152-R22-10PSI',
    nama_layanan: 'Tambah Freon R22 / 10 PSI (1.5PK - 2PK)',
    kategori: 'perbaikan',
    harga: 60000,
    durasi_menit: 30,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Penambahan gas freon R22 per 10 PSI untuk AC lama 1.5PK - 2PK.'
  },
  {
    kode: 'SRV-FREON-152-R22-150PSI',
    nama_layanan: 'Isi Ulang Freon R22 / 150 PSI (1.5PK - 2PK)',
    kategori: 'perbaikan',
    harga: 630000,
    durasi_menit: 60,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengisian ulang freon R22 penuh 150 PSI untuk AC ukuran 1.5PK - 2PK.'
  },

  // ==========================================
  // UKURAN AC 1,5PK - 2PK : PASANG & BONGKAR
  // ==========================================
  {
    kode: 'SRV-INST-152-RMH-PASANG',
    nama_layanan: 'Pasang AC (1.5PK - 2PK) - Rumah',
    kategori: 'instalasi',
    harga: 350000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 180,
    deskripsi: 'Pemasangan unit indoor & outdoor AC 1.5PK - 2PK di rumah tinggal beserta proses vakum.'
  },
  {
    kode: 'SRV-INST-152-RMH-BONGKAR',
    nama_layanan: 'Bongkar AC (1.5PK - 2PK) - Rumah',
    kategori: 'instalasi',
    harga: 150000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Pembongkaran unit AC 1.5PK - 2PK di rumah dengan penguncian freon pump down.'
  },
  {
    kode: 'SRV-INST-152-KTR-PASANG',
    nama_layanan: 'Pasang AC (1.5PK - 2PK) - Kantor / Tempat Usaha',
    kategori: 'instalasi',
    harga: 400000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 180,
    deskripsi: 'Instalasi pasang AC unit 1.5PK - 2PK pada gedung kantor / ruko tempat usaha.'
  },
  {
    kode: 'SRV-INST-152-KTR-BONGKAR',
    nama_layanan: 'Bongkar AC (1.5PK - 2PK) - Kantor / Tempat Usaha',
    kategori: 'instalasi',
    harga: 150000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Bongkar unit AC 1.5PK - 2PK pada gedung kantor / ruko tempat usaha.'
  },
  {
    kode: 'SRV-INST-152-APT-PASANG',
    nama_layanan: 'Pasang AC (1.5PK - 2PK) - Apartemen',
    kategori: 'instalasi',
    harga: 400000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 180,
    deskripsi: 'Instalasi unit AC 1.5PK - 2PK di apartemen lengkap dengan SOP proteksi interior.'
  },
  {
    kode: 'SRV-INST-152-APT-BONGKAR',
    nama_layanan: 'Bongkar AC (1.5PK - 2PK) - Apartemen',
    kategori: 'instalasi',
    harga: 150000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Bongkar unit AC 1.5PK - 2PK di gedung apartemen.'
  },
  {
    kode: 'SRV-INST-152-PRS-PASANG',
    nama_layanan: 'Pasang AC (1.5PK - 2PK) - Gedung / Korporasi',
    kategori: 'instalasi',
    harga: 400000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 180,
    deskripsi: 'Pemasangan AC unit besar 1.5PK - 2PK di fasilitas gedung korporasi / pabrik.'
  },
  {
    kode: 'SRV-INST-152-PRS-BONGKAR',
    nama_layanan: 'Bongkar AC (1.5PK - 2PK) - Gedung / Korporasi',
    kategori: 'instalasi',
    harga: 150000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Pembongkaran unit AC 1.5PK - 2PK di gedung korporasi / perusahaan.'
  },

  // ==========================================
  // PERBAIKAN, PENGECEKAN, PENGELASAN & SPAREPART
  // ==========================================
  {
    kode: 'SRV-PERB-KAPASITOR',
    nama_layanan: 'Pergantian Kapasitor',
    kategori: 'perbaikan',
    harga: 150000,
    durasi_menit: 45,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Jasa dan penggantian kapasitor baru untuk motor fan atau kompresor AC yang lemah / macet.'
  },
  {
    kode: 'SRV-PERB-CEK-BOCOR-RINGAN',
    nama_layanan: 'Pengecekan Kebocoran Freon Ringan',
    kategori: 'perbaikan',
    harga: 100000,
    durasi_menit: 45,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pemeriksaan titik kebocoran halus pada nepel sambungan pipa & pentil pipa freon.'
  },
  {
    kode: 'SRV-PERB-CEK-BOCOR-BERAT',
    nama_layanan: 'Pengecekan Kebocoran Freon Berat',
    kategori: 'perbaikan',
    harga: 150000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengecekan kebocoran tingkat lanjut pada pipa instalasi tertanam atau kisi evaporator.'
  },
  {
    kode: 'SRV-PERB-CEK-BOCOR-ULTIMATE',
    nama_layanan: 'Pengecekan Kebocoran Freon Ultimate',
    kategori: 'perbaikan',
    harga: 200000,
    durasi_menit: 90,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Deteksi komprehensif tekanan tinggi nitrogen untuk menemukan kebocoran mikro di seluruh jalur instalasi.'
  },
  {
    kode: 'SRV-CUCI-FLUSHING-INDOOR',
    nama_layanan: 'Flushing Indoor',
    kategori: 'cuci',
    harga: 350000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan pipa evaporator indoor dari sisa oli berkerak & kontaminan dengan cairan khusus flushing.'
  },
  {
    kode: 'SRV-CUCI-FLUSHING-TOTAL',
    nama_layanan: 'Flushing Total',
    kategori: 'cuci',
    harga: 600000,
    durasi_menit: 150,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Flushing total sirkulasi refrigeran indoor, outdoor & pipa kapiler dari asam dan oli gosong kompresor.'
  },
  {
    kode: 'SRV-PERB-LAS-TITIK',
    nama_layanan: 'Las per Titik',
    kategori: 'perbaikan',
    harga: 50000,
    durasi_menit: 30,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengelasan per titik pipa tembaga menggunakan kawat perak las standar refrigrasi.'
  },
  {
    kode: 'SRV-INST-BOBOK-1M',
    nama_layanan: 'Instalasi Bobok Tembok 1M',
    kategori: 'instalasi',
    harga: 100000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Jasa pembobokan dinding tembok per meter lari untuk penanaman jalur pipa AC.'
  },
  {
    kode: 'SRV-INST-PLAFON-1M',
    nama_layanan: 'Instalasi Plafon 1M',
    kategori: 'instalasi',
    harga: 50000,
    durasi_menit: 45,
    garansi_hari: 14,
    interval_maintenance_hari: 180,
    deskripsi: 'Pemasangan jalur pipa AC melalui rangka plafon per meter lari.'
  },
  {
    kode: 'SRV-PERB-GANTI-UBEN',
    nama_layanan: 'Ganti Uben Evaporator',
    kategori: 'perbaikan',
    harga: 150000,
    durasi_menit: 60,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Penggantian lekukan u-bend pipa tembaga evaporator yang keropos atau bocor.'
  },
  {
    kode: 'SRV-LAIN-CEK-RINGAN',
    nama_layanan: 'Pengecekan Ringan',
    kategori: 'lainnya',
    harga: 50000,
    durasi_menit: 30,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengecekan diagnosa umum fungsi remote, arus listrik, suhu hembusan, dan kondisi umum unit AC.'
  },
  {
    kode: 'SRV-LAIN-CEK-BERAT',
    nama_layanan: 'Pengecekan Berat',
    kategori: 'lainnya',
    harga: 100000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Diagnosa mendalam kompresor macet, korsleting modul PCB, motor inverter, atau kerusakan mekanis kompleks.'
  },
  {
    kode: 'SRV-LAIN-ANGKUT-5KM',
    nama_layanan: 'Jasa Bawa Unit (Radius 5KM)',
    kategori: 'lainnya',
    harga: 50000,
    durasi_menit: 45,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Jasa transportasi pengangkutan unit AC indoor/outdoor ke workshop teknisi radius 5KM.'
  },
  {
    kode: 'SRV-LAIN-ANGKUT-10KM',
    nama_layanan: 'Jasa Bawa Unit (Radius 10KM)',
    kategori: 'lainnya',
    harga: 100000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Jasa transportasi pengangkutan unit AC indoor/outdoor ke workshop teknisi radius 10KM.'
  },
  {
    kode: 'SRV-PERB-GANTI-SPAREPART',
    nama_layanan: 'Pergantian Sparepart',
    kategori: 'perbaikan',
    harga: 1000000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Jasa pergantian modul PCB / kompresor / motor blower sparepart utama dengan garansi resmi 30 hari.'
  }
];

async function syncPriceList() {
  const client = await pool.connect();
  try {
    console.log(`Starting PriceList synchronization for ${SERVICES_CATALOG.length} items...`);
    await client.query('BEGIN');

    // 1. Update existing IDs 1 to 5 specifically
    const preservedIds = [1, 2, 3, 4, 5];
    for (const item of SERVICES_CATALOG) {
      if (item.id && preservedIds.includes(item.id)) {
        await client.query(`
          UPDATE service_catalog
          SET kode = $1,
              nama_layanan = $2,
              kategori = $3,
              deskripsi = $4,
              harga = $5,
              durasi_menit = $6,
              garansi_hari = $7,
              interval_maintenance_hari = $8,
              aktif = true,
              is_synthetic = false,
              updated_at = NOW()
          WHERE id = $9
        `, [
          item.kode,
          item.nama_layanan,
          item.kategori,
          item.deskripsi,
          item.harga,
          item.durasi_menit,
          item.garansi_hari,
          item.interval_maintenance_hari,
          item.id
        ]);
        console.log(`Updated preserved service ID ${item.id} (${item.nama_layanan}) -> Rp ${item.harga.toLocaleString('id-ID')}`);
      }
    }

    // 2. Insert or update all remaining items
    for (const item of SERVICES_CATALOG) {
      if (item.id && preservedIds.includes(item.id)) continue;

      await client.query(`
        INSERT INTO service_catalog (
          kode, nama_layanan, kategori, deskripsi, harga, durasi_menit, garansi_hari, interval_maintenance_hari, aktif, is_synthetic, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false, NOW())
        ON CONFLICT (kode) DO UPDATE SET
          nama_layanan = EXCLUDED.nama_layanan,
          kategori = EXCLUDED.kategori,
          deskripsi = EXCLUDED.deskripsi,
          harga = EXCLUDED.harga,
          durasi_menit = EXCLUDED.durasi_menit,
          garansi_hari = EXCLUDED.garansi_hari,
          interval_maintenance_hari = EXCLUDED.interval_maintenance_hari,
          aktif = true,
          is_synthetic = false,
          updated_at = NOW()
      `, [
        item.kode,
        item.nama_layanan,
        item.kategori,
        item.deskripsi,
        item.harga,
        item.durasi_menit,
        item.garansi_hari,
        item.interval_maintenance_hari
      ]);
    }

    await client.query('COMMIT');
    console.log('PriceList synchronization committed successfully!');

    const countRes = await client.query('SELECT COUNT(*)::int AS total FROM service_catalog WHERE aktif = true');
    console.log(`Total active services in DB now: ${countRes.rows[0].total}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error synchronizing price list:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  syncPriceList()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { syncPriceList, SERVICES_CATALOG };
