import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import {
  Tag,
  Clock,
  ShieldCheck,
  Sparkles,
  Plus,
  Edit3,
  Check,
  Layers,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'cuci', label: 'Cuci & Perawatan Berkala' },
  { value: 'perbaikan', label: 'Perbaikan & Isi Freon' },
  { value: 'instalasi', label: 'Bongkar Pasang & Instalasi' },
  { value: 'lainnya', label: 'Layanan Lainnya' },
];

function mapCategoryValue(cat) {
  const v = String(cat || '').trim().toLowerCase();
  if (['cuci', 'cleaning', 'deep clean'].includes(v)) return 'cuci';
  if (['perbaikan', 'repair', 'freon', 'freon & clean'].includes(v)) return 'perbaikan';
  if (['instalasi', 'pasang', 'bongkar pasang'].includes(v)) return 'instalasi';
  if (v === 'lainnya') return 'lainnya';
  return 'cuci';
}

function getCategoryLabel(cat) {
  const norm = mapCategoryValue(cat);
  return CATEGORY_OPTIONS.find((o) => o.value === norm)?.label || 'Cuci & Perawatan Berkala';
}

const DEFAULT_SERVICES_META = [
  {
    id: 1,
    kode: 'SRV-CUCI-01',
    nama: 'Cuci AC Standard',
    kategori: 'cuci',
    badge: 'Perawatan Rutin 2–3 Bulan',
    harga: 75000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan menyeluruh filter udara, kisi evaporator indoor, kondensor outdoor, dan pengecekan tekanan freon.',
    scope: [
      'Cuci filter udara & cover casing unit indoor',
      'Cuci evaporator unit indoor & saluran drainase',
      'Semprot kisi kondensor unit outdoor',
      'Pengecekan suhu dingin & arus listrik (Ampere)',
    ],
    isPopular: false,
  },
  {
    id: 2,
    kode: 'SRV-BONGKAR-01',
    nama: 'Bongkar Pasang AC',
    kategori: 'instalasi',
    badge: 'Pindah Rumah & Kantor',
    harga: 350000,
    durasi_menit: 120,
    garansi_hari: 30,
    interval_maintenance_hari: 180,
    deskripsi: 'Pelepasan unit lama dengan pump-down refrigeran aman serta pemasangan kembali di lokasi baru secara presisi.',
    scope: [
      'Pump-down freon aman tanpa membuang refrigeran',
      'Pemasangan unit indoor & outdoor presisi waterpass',
      'Proses vakum pipa instalasi standar pabrikan',
      'Tes kebocoran sambungan & uji performa dingin',
    ],
    isPopular: false,
  },
  {
    id: 3,
    kode: 'SRV-FREON-01',
    nama: 'Isi Freon R32',
    kategori: 'perbaikan',
    badge: 'Solusi AC Kurang Dingin',
    harga: 150000,
    durasi_menit: 45,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pengisian ulang refrigeran murni R32/R410A bertekanan presisi sesuai spesifikasi pabrikan.',
    scope: [
      'Pengecekan kebocoran sambungan nepel & flare joint',
      'Pengukuran tekanan manifold & arus kompresor',
      'Pengisian freon murni hingga suhu optimal',
      'Garansi dingin selama 30 hari kalender',
    ],
    isPopular: false,
  },
  {
    id: 4,
    kode: 'SRV-CUCI-CORE',
    nama: 'Cuci AC Core (Deep Clean)',
    kategori: 'cuci',
    badge: 'Rekomendasi · Tuntas Bocor & Bau',
    harga: 120000,
    durasi_menit: 90,
    garansi_hari: 30,
    interval_maintenance_hari: 90,
    deskripsi: 'Pembersihan tuntas dengan membongkar talang air dan rotor blower untuk mengatasi AC bocor air serta bau apek.',
    scope: [
      'Seluruh cakupan Paket Cuci AC Standard',
      'Bongkar total talang air & blower fan indoor',
      'Flushing pipa drainase anti-mampet & anti-bocor',
      'Pengecekan tekanan freon & kelistrikan lengkap',
    ],
    isPopular: true,
  },
  {
    id: 5,
    kode: 'SRV-CUCI-FREON',
    nama: 'Paket Core + Isi Freon',
    kategori: 'perbaikan',
    badge: 'Overhaul + Freon Murni',
    harga: 220000,
    durasi_menit: 105,
    garansi_hari: 45,
    interval_maintenance_hari: 120,
    deskripsi: 'Kombinasi cuci overhaul menyeluruh ditambah pengisian ulang freon bertekanan presisi sesuai standar pabrikan.',
    scope: [
      'Seluruh cakupan Cuci AC Core (Deep Clean)',
      'Pengisian freon murni R32 / R410A presisi',
      'Pemeriksaan kebocoran & arus ampere kompresor',
      'Garansi dingin penuh selama 45 hari kalender',
    ],
    isPopular: false,
  },
];

function validateServiceForm(form, isCreate = false) {
  const errors = {};
  if (isCreate) {
    const kode = String(form.kode || '').trim();
    if (!kode) {
      errors.kode = 'Kode layanan wajib diisi.';
    } else if (!/^[a-zA-Z0-9-]{2,40}$/.test(kode)) {
      errors.kode = 'Kode hanya boleh berisi huruf, angka, dan tanda hubung (2–40 karakter).';
    }
  }
  const nama = String(form.nama_layanan || '').trim();
  if (!nama || nama.length < 3) {
    errors.nama_layanan = 'Nama layanan minimal 3 karakter.';
  }
  const harga = Number(form.harga);
  if (Number.isNaN(harga) || harga < 0 || harga > 100000000) {
    errors.harga = 'Harga harus berupa angka positif yang valid.';
  }
  const durasi = Number(form.durasi_menit);
  if (Number.isNaN(durasi) || durasi < 15 || durasi > 480) {
    errors.durasi_menit = 'Durasi pengerjaan harus antara 15 hingga 480 menit.';
  }
  const garansi = Number(form.garansi_hari);
  if (![14, 30, 45].includes(garansi)) {
    errors.garansi_hari = 'Masa garansi harus dipilih antara 14, 30, atau 45 hari.';
  }
  const interval = Number(form.interval_maintenance_hari);
  if (Number.isNaN(interval) || interval < 7 || interval > 365) {
    errors.interval_maintenance_hari = 'Interval pengingat perawatan harus antara 7 hingga 365 hari.';
  }
  const deskripsi = String(form.deskripsi || '').trim();
  if (deskripsi.length < 10) {
    errors.deskripsi = 'Deskripsi SOP layanan minimal 10 karakter.';
  }
  return errors;
}

export default function AdminServices() {
  const { error: showError, success: showSuccess } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingService, setEditingService] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editApiError, setEditApiError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    kode: '',
    nama_layanan: '',
    kategori: 'cuci',
    harga: 75000,
    durasi_menit: 60,
    garansi_hari: 14,
    interval_maintenance_hari: 90,
    deskripsi: '',
  });
  const [createErrors, setCreateErrors] = useState({});
  const [createApiError, setCreateApiError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('all');
  const [selectedUkuran, setSelectedUkuran] = useState('all');

  const enrichService = useCallback((dbSvc) => {
    const sName = (dbSvc.nama_layanan || dbSvc.nama || '').toLowerCase();
    const def = DEFAULT_SERVICES_META.find(
      (d) =>
        d.kode === dbSvc.kode
        || d.nama.toLowerCase() === sName
        || (d.id === 4 && sName.includes('core') && !sName.includes('freon'))
        || (d.id === 5 && sName.includes('core') && sName.includes('freon'))
        || (d.id === 1 && sName.includes('stand'))
        || (d.id === 2 && sName.includes('bongkar'))
        || (d.id === 3 && sName.includes('freon') && !sName.includes('core'))
    );

    const garansiHari = Number(dbSvc.garansi_hari || def?.garansi_hari || 14);
    const intervalHari = Number(dbSvc.interval_maintenance_hari || def?.interval_maintenance_hari || 90);
    const kategoriNorm = mapCategoryValue(dbSvc.kategori || def?.kategori || 'cuci');

    return {
      ...def,
      ...dbSvc,
      id: dbSvc.id,
      kode: dbSvc.kode || def?.kode || `SRV-${dbSvc.id}`,
      nama: dbSvc.nama_layanan || dbSvc.nama || def?.nama || 'Layanan Servis',
      nama_layanan: dbSvc.nama_layanan || dbSvc.nama || def?.nama || 'Layanan Servis',
      harga: Number(dbSvc.harga !== undefined ? dbSvc.harga : (def?.harga || 75000)),
      durasi_menit: Number(dbSvc.durasi_menit !== undefined ? dbSvc.durasi_menit : (def?.durasi_menit || 60)),
      kategori: kategoriNorm,
      kategori_label: getCategoryLabel(kategoriNorm),
      deskripsi: dbSvc.deskripsi || def?.deskripsi || '',
      garansi_hari: [14, 30, 45].includes(garansiHari) ? garansiHari : 14,
      interval_maintenance_hari: intervalHari,
      garansi: `${[14, 30, 45].includes(garansiHari) ? garansiHari : 14} Hari Kalender`,
      badge: def?.badge || getCategoryLabel(kategoriNorm),
      scope: def?.scope || [
        'Pembersihan & pemeriksaan sesuai SOP NARA AC',
        'Pengecekan kelistrikan & tekanan pendingin',
        'Dokumentasi foto sebelum & sesudah pengerjaan',
      ],
      isPopular: def ? def.isPopular : false,
      aktif: dbSvc.aktif !== undefined ? dbSvc.aktif : true,
    };
  }, []);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/service-catalog');
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_SERVICES_META;
      setServices(list.map(enrichService));
    } catch {
      setServices(DEFAULT_SERVICES_META.map(enrichService));
    } finally {
      setLoading(false);
    }
  }, [enrichService]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const categoryCounts = useMemo(() => {
    const counts = { all: services.length, cuci: 0, perbaikan: 0, instalasi: 0, lainnya: 0 };
    services.forEach((s) => {
      const cat = mapCategoryValue(s.kategori);
      if (counts[cat] !== undefined) counts[cat] += 1;
      else counts.lainnya += 1;
    });
    return counts;
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      if (selectedKategori !== 'all' && mapCategoryValue(svc.kategori) !== selectedKategori) {
        return false;
      }

      const sName = (svc.nama_layanan || svc.nama || '').toLowerCase();
      const sKode = (svc.kode || '').toLowerCase();

      if (selectedUkuran === '0.5-1') {
        const is051 = sName.includes('0.5pk') || sName.includes('1pk') || sKode.includes('051') || sKode.includes('05-1');
        if (!is051) return false;
      } else if (selectedUkuran === '1.5-2') {
        const is152 = sName.includes('1.5pk') || sName.includes('2pk') || sKode.includes('152') || sKode.includes('15-2');
        if (!is152) return false;
      } else if (selectedUkuran === 'khusus') {
        const hasPK = sName.includes('pk') || sKode.includes('051') || sKode.includes('152');
        if (hasPK) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = sName.includes(q);
        const matchKode = sKode.includes(q);
        const matchDesc = (svc.deskripsi || '').toLowerCase().includes(q);
        const matchHarga = String(svc.harga || '').includes(q);
        if (!matchName && !matchKode && !matchDesc && !matchHarga) return false;
      }

      return true;
    });
  }, [services, selectedKategori, selectedUkuran, searchQuery]);

  useEffect(() => {
    if (!isEditModalOpen && !isCreateModalOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!saveLoading) setIsEditModalOpen(false);
        if (!createLoading) setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isEditModalOpen, isCreateModalOpen, saveLoading, createLoading]);

  const handleOpenEdit = (svc) => {
    setEditErrors({});
    setEditApiError('');
    setEditingService({
      id: svc.id,
      kode: svc.kode || '',
      nama_layanan: svc.nama_layanan || svc.nama || '',
      kategori: mapCategoryValue(svc.kategori),
      harga: Number(svc.harga || 75000),
      durasi_menit: Number(svc.durasi_menit || 60),
      garansi_hari: [14, 30, 45].includes(Number(svc.garansi_hari)) ? Number(svc.garansi_hari) : 14,
      interval_maintenance_hari: Number(svc.interval_maintenance_hari || 90),
      deskripsi: svc.deskripsi || '',
      aktif: svc.aktif !== undefined ? svc.aktif : true,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingService || saveLoading) return;

    const errs = validateServiceForm(editingService, false);
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditErrors({});
    setEditApiError('');
    setSaveLoading(true);

    try {
      const payload = {
        nama_layanan: editingService.nama_layanan.trim(),
        kategori: mapCategoryValue(editingService.kategori),
        harga: Math.round(Number(editingService.harga)),
        durasi_menit: Math.round(Number(editingService.durasi_menit)),
        garansi_hari: Number(editingService.garansi_hari),
        interval_maintenance_hari: Math.round(Number(editingService.interval_maintenance_hari)),
        deskripsi: editingService.deskripsi.trim(),
        aktif: Boolean(editingService.aktif),
      };

      const res = await api.patch(`/service-catalog/${editingService.id}`, payload);
      const updatedData = res?.data?.data || res?.data || res || payload;

      setServices((prev) =>
        prev.map((s) => (s.id === editingService.id ? enrichService({ ...s, ...updatedData, id: s.id }) : s))
      );

      showSuccess(`Layanan "${payload.nama_layanan}" berhasil diperbarui.`);
      setIsEditModalOpen(false);
      setEditingService(null);
    } catch (err) {
      const msg = err?.fields
        ? Object.values(err.fields)[0]
        : (err?.message || 'Gagal menyimpan perubahan layanan.');
      if (err?.fields) setEditErrors(err.fields);
      setEditApiError(msg);
      showError(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOpenCreate = () => {
    const nextId = services.length + 1;
    setCreateErrors({});
    setCreateApiError('');
    setCreateForm({
      kode: `SRV-CUSTOM-${String(nextId).padStart(2, '0')}`,
      nama_layanan: '',
      kategori: 'cuci',
      harga: 75000,
      durasi_menit: 60,
      garansi_hari: 14,
      interval_maintenance_hari: 90,
      deskripsi: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (createLoading) return;

    const errs = validateServiceForm(createForm, true);
    if (Object.keys(errs).length > 0) {
      setCreateErrors(errs);
      return;
    }
    setCreateErrors({});
    setCreateApiError('');
    setCreateLoading(true);

    try {
      const payload = {
        kode: createForm.kode.trim().toUpperCase(),
        nama_layanan: createForm.nama_layanan.trim(),
        kategori: mapCategoryValue(createForm.kategori),
        harga: Math.round(Number(createForm.harga)),
        durasi_menit: Math.round(Number(createForm.durasi_menit)),
        garansi_hari: Number(createForm.garansi_hari),
        interval_maintenance_hari: Math.round(Number(createForm.interval_maintenance_hari)),
        deskripsi: createForm.deskripsi.trim(),
      };

      const res = await api.post('/service-catalog', payload);
      const created = res?.data?.data || res?.data || res || payload;

      setServices((prev) => [...prev, enrichService(created)]);
      showSuccess(`Paket layanan "${payload.nama_layanan}" berhasil ditambahkan ke katalog resmi.`);
      setIsCreateModalOpen(false);
      await fetchCatalog();
    } catch (err) {
      const msg = err?.fields
        ? Object.values(err.fields)[0]
        : (err?.message || 'Gagal menambahkan layanan baru.');
      if (err?.fields) setCreateErrors(err.fields);
      setCreateApiError(msg);
      showError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50 relative min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Katalog Layanan & Tarif Resmi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola paket layanan, tarif satuan, durasi pengerjaan, masa garansi (14/30/45 hari), serta interval perawatan berkala.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer shadow-sm shadow-blue-600/20 flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Paket Servis</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Paket Servis</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{services.length} Layanan</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tersedia di katalog & form booking</p>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-bold">Opsi Garansi Resmi</p>
            <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">14 / 30 / 45 Hari</h3>
            <p className="text-xs text-slate-500 mt-0.5">Masa garansi resmi pengerjaan</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-blue-600 font-bold">Sinkronisasi Tarif</p>
            <h3 className="text-2xl font-extrabold text-blue-700 mt-1">Real-Time</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tersinkronisasi ke halaman booking</p>
          </div>
          <div className="w-11 h-11 bg-sky-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Semua Layanan', count: categoryCounts.all },
              { id: 'cuci', label: 'Cuci & Perawatan', count: categoryCounts.cuci },
              { id: 'perbaikan', label: 'Perbaikan & Freon', count: categoryCounts.perbaikan },
              { id: 'instalasi', label: 'Bongkar & Pasang', count: categoryCounts.instalasi },
              { id: 'lainnya', label: 'Layanan Lainnya', count: categoryCounts.lainnya },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedKategori(tab.id)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer',
                  selectedKategori === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-black',
                    selectedKategori === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari layanan, kode, harga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs rounded-xl h-10 border-slate-200 bg-slate-50 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-filter Ukuran AC & Tempat */}
        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider mr-1">
            <Filter className="w-3 h-3 text-blue-600" />
            Filter Segmen:
          </span>
          {[
            { id: 'all', label: 'Semua Kapasitas & Segmen' },
            { id: '0.5-1', label: 'AC 0.5 PK – 1 PK' },
            { id: '1.5-2', label: 'AC 1.5 PK – 2 PK' },
            { id: 'khusus', label: 'Sparepart & Layanan Khusus' },
          ].map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSelectedUkuran(sub.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                selectedUkuran === sub.id
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {sub.label}
            </button>
          ))}

          <span className="ml-auto text-xs font-semibold text-slate-500">
            Menampilkan <strong className="text-slate-800">{filteredServices.length}</strong> dari {services.length} layanan
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
          Memuat katalog layanan...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Tidak ada layanan yang sesuai</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tidak ditemukan paket servis dengan kata kunci &quot;{searchQuery}&quot; atau filter yang aktif.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedKategori('all');
              setSelectedUkuran('all');
            }}
            className="rounded-xl text-xs font-bold"
          >
            Reset Semua Filter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((svc) => (
            <div
              key={svc.id || svc.kode}
              className={cn(
                'bg-white rounded-2xl p-6 border shadow-xs flex flex-col justify-between transition-all hover:shadow-md',
                !svc.aktif
                  ? 'border-slate-200 opacity-75'
                  : svc.isPopular
                    ? 'border-blue-300 ring-2 ring-blue-500/15'
                    : 'border-slate-200/90'
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border',
                      svc.isPopular
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    )}
                  >
                    {svc.kategori_label}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {svc.kode}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
                    {svc.nama_layanan}
                  </h2>
                  {!svc.aktif && (
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold uppercase">
                      Nonaktif
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-3">
                  {svc.deskripsi}
                </p>

                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-slate-400 block">Tarif Satuan</span>
                    <span className="text-xl font-black text-blue-700 font-mono">
                      Rp {Number(svc.harga || 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-slate-500"> / unit</span>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <div className="flex items-center gap-1 text-slate-700 font-semibold justify-end">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>{svc.durasi_menit} Menit</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold justify-end">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Garansi {svc.garansi_hari} Hari</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Pengingat Berkala:
                  </span>
                  <span className="font-bold text-slate-700">Setiap {svc.interval_maintenance_hari} Hari</span>
                </div>

                {svc.scope && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Cakupan SOP Layanan
                    </p>
                    <ul className="space-y-1">
                      {svc.scope.slice(0, 4).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-400">
                  ID #{svc.id}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(svc)}
                  className="rounded-xl text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 cursor-pointer h-9 px-3.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ubah Layanan</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {typeof document !== 'undefined' && createPortal(
        <>
          {isEditModalOpen && editingService && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
              onClick={() => !saveLoading && setIsEditModalOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-edit-service-title"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
              >
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 id="modal-edit-service-title" className="font-bold text-base text-white">
                        Ubah Paket Layanan & Tarif
                      </h2>
                      <p className="text-xs text-blue-100 font-mono">
                        {editingService.kode} · ID #{editingService.id}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={saveLoading}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                    aria-label="Tutup modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs overflow-y-auto">
                  {editApiError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{editApiError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="edit-svc-nama" className="block font-bold text-slate-700 mb-1">
                        Nama Paket Layanan <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="edit-svc-nama"
                        type="text"
                        value={editingService.nama_layanan}
                        onChange={(e) => setEditingService({ ...editingService, nama_layanan: e.target.value })}
                        placeholder="Contoh: Cuci AC Standard"
                        className="rounded-xl border-slate-200 h-10 font-semibold"
                        required
                      />
                      {editErrors.nama_layanan && (
                        <p className="text-[11px] text-rose-600 mt-1">{editErrors.nama_layanan}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="edit-svc-harga" className="block font-bold text-slate-700 mb-1">
                        Tarif Satuan (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="edit-svc-harga"
                        type="number"
                        step="1000"
                        min="0"
                        value={editingService.harga}
                        onChange={(e) => setEditingService({ ...editingService, harga: e.target.value })}
                        className="rounded-xl border-slate-200 h-10 font-mono font-bold text-slate-900"
                        required
                      />
                      <p className="text-[11px] text-blue-600 mt-1 font-mono">
                        Rp {Number(editingService.harga || 0).toLocaleString('id-ID')} / unit
                      </p>
                      {editErrors.harga && (
                        <p className="text-[11px] text-rose-600 mt-1">{editErrors.harga}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="edit-svc-durasi" className="block font-bold text-slate-700 mb-1">
                        Durasi Pengerjaan (Menit) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="edit-svc-durasi"
                        type="number"
                        min="15"
                        max="480"
                        step="5"
                        value={editingService.durasi_menit}
                        onChange={(e) => setEditingService({ ...editingService, durasi_menit: e.target.value })}
                        className="rounded-xl border-slate-200 h-10 font-bold text-slate-900"
                        required
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Rentang: 15–480 menit per unit</p>
                      {editErrors.durasi_menit && (
                        <p className="text-[11px] text-rose-600 mt-1">{editErrors.durasi_menit}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="edit-svc-garansi" className="block font-bold text-slate-700 mb-1">
                        Masa Garansi Resmi <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="edit-svc-garansi"
                        value={editingService.garansi_hari}
                        onChange={(e) => setEditingService({ ...editingService, garansi_hari: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 bg-white h-10 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={14}>14 Hari Kalender</option>
                        <option value={30}>30 Hari Kalender</option>
                        <option value={45}>45 Hari Kalender</option>
                      </select>
                      {editErrors.garansi_hari && (
                        <p className="text-[11px] text-rose-600 mt-1">{editErrors.garansi_hari}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="edit-svc-interval" className="block font-bold text-slate-700 mb-1">
                        Interval Perawatan Berkala (Hari) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="edit-svc-interval"
                        type="number"
                        min="7"
                        max="365"
                        value={editingService.interval_maintenance_hari}
                        onChange={(e) => setEditingService({ ...editingService, interval_maintenance_hari: e.target.value })}
                        className="rounded-xl border-slate-200 h-10 font-semibold text-slate-900"
                        required
                      />
                      {editErrors.interval_maintenance_hari && (
                        <p className="text-[11px] text-rose-600 mt-1">{editErrors.interval_maintenance_hari}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="edit-svc-kategori" className="block font-bold text-slate-700 mb-1">
                        Kategori Layanan <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="edit-svc-kategori"
                        value={editingService.kategori}
                        onChange={(e) => setEditingService({ ...editingService, kategori: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white h-10 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="edit-svc-status" className="block font-bold text-slate-700 mb-1">
                        Status Katalog
                      </label>
                      <select
                        id="edit-svc-status"
                        value={editingService.aktif ? 'aktif' : 'nonaktif'}
                        onChange={(e) => setEditingService({ ...editingService, aktif: e.target.value === 'aktif' })}
                        className="w-full rounded-xl border border-slate-200 bg-white h-10 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="aktif">Aktif (Tampil di Booking)</option>
                        <option value="nonaktif">Nonaktif (Disembunyikan)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="edit-svc-deskripsi" className="block font-bold text-slate-700 mb-1">
                        Deskripsi Cakupan SOP (Minimal 10 Karakter) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="edit-svc-deskripsi"
                        rows={3}
                        value={editingService.deskripsi}
                        onChange={(e) => setEditingService({ ...editingService, deskripsi: e.target.value })}
                        placeholder="Rincian cakupan pengerjaan teknisi..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {editErrors.deskripsi && (
                        <p className="text-[11px] text-rose-600 mt-1">{editErrors.deskripsi}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditModalOpen(false)}
                      disabled={saveLoading}
                      className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold h-10 px-4 cursor-pointer"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-10 px-5 cursor-pointer flex items-center gap-1.5"
                    >
                      {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Simpan Perubahan</span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isCreateModalOpen && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
              onClick={() => !createLoading && setIsCreateModalOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-create-service-title"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
              >
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 id="modal-create-service-title" className="font-bold text-base text-white">
                        Tambah Paket Servis Baru
                      </h2>
                      <p className="text-xs text-blue-100">
                        Daftarkan layanan baru ke katalog resmi CV. Nara Teknindotama
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createLoading}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                    aria-label="Tutup modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateService} className="p-6 space-y-4 text-xs overflow-y-auto">
                  {createApiError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{createApiError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="create-svc-kode" className="block font-bold text-slate-700 mb-1">
                        Kode Layanan <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="create-svc-kode"
                        type="text"
                        value={createForm.kode}
                        onChange={(e) => setCreateForm({ ...createForm, kode: e.target.value.toUpperCase() })}
                        placeholder="SRV-CUSTOM-01"
                        className="rounded-xl border-slate-200 h-10 font-mono font-bold uppercase text-slate-900"
                        required
                      />
                      {createErrors.kode && (
                        <p className="text-[11px] text-rose-600 mt-1">{createErrors.kode}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="create-svc-kategori" className="block font-bold text-slate-700 mb-1">
                        Kategori Layanan <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="create-svc-kategori"
                        value={createForm.kategori}
                        onChange={(e) => setCreateForm({ ...createForm, kategori: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white h-10 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="create-svc-nama" className="block font-bold text-slate-700 mb-1">
                        Nama Paket Layanan <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="create-svc-nama"
                        type="text"
                        value={createForm.nama_layanan}
                        onChange={(e) => setCreateForm({ ...createForm, nama_layanan: e.target.value })}
                        placeholder="Contoh: Cuci AC Cassette 2 PK"
                        className="rounded-xl border-slate-200 h-10 font-semibold"
                        required
                      />
                      {createErrors.nama_layanan && (
                        <p className="text-[11px] text-rose-600 mt-1">{createErrors.nama_layanan}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="create-svc-harga" className="block font-bold text-slate-700 mb-1">
                        Tarif Satuan (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="create-svc-harga"
                        type="number"
                        step="1000"
                        min="0"
                        value={createForm.harga}
                        onChange={(e) => setCreateForm({ ...createForm, harga: e.target.value })}
                        className="rounded-xl border-slate-200 h-10 font-mono font-bold text-slate-900"
                        required
                      />
                      <p className="text-[11px] text-blue-600 mt-1 font-mono">
                        Rp {Number(createForm.harga || 0).toLocaleString('id-ID')} / unit
                      </p>
                      {createErrors.harga && (
                        <p className="text-[11px] text-rose-600 mt-1">{createErrors.harga}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="create-svc-durasi" className="block font-bold text-slate-700 mb-1">
                        Durasi Pengerjaan (Menit) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="create-svc-durasi"
                        type="number"
                        min="15"
                        max="480"
                        step="5"
                        value={createForm.durasi_menit}
                        onChange={(e) => setCreateForm({ ...createForm, durasi_menit: e.target.value })}
                        className="rounded-xl border-slate-200 h-10 font-bold text-slate-900"
                        required
                      />
                      {createErrors.durasi_menit && (
                        <p className="text-[11px] text-rose-600 mt-1">{createErrors.durasi_menit}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="create-svc-garansi" className="block font-bold text-slate-700 mb-1">
                        Masa Garansi Resmi <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="create-svc-garansi"
                        value={createForm.garansi_hari}
                        onChange={(e) => setCreateForm({ ...createForm, garansi_hari: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 bg-white h-10 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={14}>14 Hari Kalender</option>
                        <option value={30}>30 Hari Kalender</option>
                        <option value={45}>45 Hari Kalender</option>
                      </select>
                      {createErrors.garansi_hari && (
                        <p className="text-[11px] text-rose-600 mt-1">{createErrors.garansi_hari}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="create-svc-interval" className="block font-bold text-slate-700 mb-1">
                        Interval Perawatan Berkala (Hari) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="create-svc-interval"
                        type="number"
                        min="7"
                        max="365"
                        value={createForm.interval_maintenance_hari}
                        onChange={(e) => setCreateForm({ ...createForm, interval_maintenance_hari: e.target.value })}
                        className="rounded-xl border-slate-200 h-10 font-semibold text-slate-900"
                        required
                      />
                      {createErrors.interval_maintenance_hari && (
                        <p className="text-[11px] text-rose-600 mt-1">{createErrors.interval_maintenance_hari}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="create-svc-deskripsi" className="block font-bold text-slate-700 mb-1">
                        Deskripsi Cakupan SOP (Minimal 10 Karakter) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="create-svc-deskripsi"
                        rows={3}
                        value={createForm.deskripsi}
                        onChange={(e) => setCreateForm({ ...createForm, deskripsi: e.target.value })}
                        placeholder="Jelaskan tahapan pengerjaan servis secara ringkas (minimal 10 karakter)..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {createErrors.deskripsi && (
                        <p className="text-[11px] text-rose-600 mt-1">{createErrors.deskripsi}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={createLoading}
                      className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold h-10 px-4 cursor-pointer"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={createLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-10 px-5 cursor-pointer flex items-center gap-1.5"
                    >
                      {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>Simpan Paket Baru</span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}
