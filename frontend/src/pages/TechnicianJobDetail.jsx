import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContextualBack } from '../hooks/useContextualBack';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { useToast } from '../components/ui/toast';
import { Badge } from '../components/ui/badge';
import { 
  CheckCircle2, MapPin, Phone, Camera, Package, Save, ArrowLeft, ArrowRight, RefreshCw, User, Play, 
  ListTodo, ClipboardEdit, AlertTriangle, Trash2, ZoomIn, UploadCloud, Check, X, Sparkles
} from 'lucide-react';

const STANDARD_SOP = [
  { task: 'Cuci Filter Udara (Indoor)', wajib: true },
  { task: 'Bersihkan Evaporator (Indoor)', wajib: true },
  { task: 'Cek Tekanan Freon', wajib: true },
  { task: 'Bersihkan Kondensor (Outdoor)', wajib: true },
  { task: 'Cek Arus Listrik & Kompresor', wajib: true },
  { task: 'Cek Pipa Kapiler & Sambungan', wajib: true },
  { task: 'Tes Nyala (Running Test)', wajib: true },
];

const API_ORIGIN = (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.startsWith('/')) 
  ? new URL(import.meta.env.VITE_API_URL).origin 
  : '';

export default function TechnicianJobDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useContext(AuthContext);
  const { error: showError, success: showSuccess } = useToast();
  const navigate = useNavigate();
  const handleBack = useContextualBack('/technician/dashboard');

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [materialId, setMaterialId] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [workOrder, setWorkOrder] = useState({ catatan: '' });
  const [newTask, setNewTask] = useState('');

  // Step state for in-process workflow: 'before_photo' | 'checklist' | 'after_photo'
  const [workStep, setWorkStep] = useState('before_photo');
  const hasAutoNavigatedRef = useRef(false);

  // Photo state with dedicated previews
  const [beforePhoto, setBeforePhoto] = useState({ file: null, preview: '' });
  const [afterPhoto, setAfterPhoto] = useState({ file: null, preview: '' });
  const [lightboxImg, setLightboxImg] = useState(null);

  // Hidden direct file inputs
  const beforeFileInputRef = useRef(null);
  const afterFileInputRef = useRef(null);

  // Delay report modal state
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayCategory, setDelayCategory] = useState('macet');
  const [delayReason, setDelayReason] = useState('');
  const [delayWaitMinutes, setDelayWaitMinutes] = useState(15);
  const [reportingDelay, setReportingDelay] = useState(false);

  const fetchJob = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get(`/technician/jobs/${id}`);
      const jobData = res.data || res;
      setJob(jobData);

      // Smart initial step placement on first load only (does not reset user position on subsequent live syncs)
      if (!hasAutoNavigatedRef.current && jobData?.status === 'on process') {
        hasAutoNavigatedRef.current = true;
        const photos = jobData.photos || [];
        const hasBfr = photos.some((p) => p.tipe === 'before');
        const hasAft = photos.some((p) => p.tipe === 'after');
        const hasChecklistStarted = (jobData.checklists || []).some((c) => c.status === 'completed');
        if (hasAft) {
          setWorkStep('after_photo');
        } else if (hasChecklistStarted) {
          setWorkStep('checklist');
        } else {
          setWorkStep('before_photo');
        }
      }
      
      setWorkOrder((prev) => ({
        catatan: isSilent && prev.catatan ? prev.catatan : (jobData?.catatan || '')
      }));
    } catch (err) {
      if (err.error?.code === 'NOT_FOUND') {
        showError('Pekerjaan tidak ditemukan.');
        navigate('/technician/dashboard');
      } else {
        showError(err.error?.message || err?.message || 'Gagal memuat detail pekerjaan.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id, navigate, showError]);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get('/technician/inventory');
      setInventory(Array.isArray(res) ? res : (res?.data || []));
    } catch (err) {
      showError('Gagal memuat inventory: ' + (err.response?.data?.error?.message || err.message));
    }
  }, [showError]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'technician') {
      navigate('/login');
      return;
    }
    fetchJob();
    fetchInventory();
  }, [id, user, authLoading, navigate, fetchJob, fetchInventory]);

  // Real-time automatic background synchronization
  useEffect(() => {
    if (authLoading || !user || user.role !== 'technician') return undefined;

    // Fast 4-second polling for live status/assignment changes
    const timer = setInterval(() => {
      fetchJob(true);
    }, 4000);

    const handleSync = () => {
      fetchJob(true);
    };

    const handleStorage = (e) => {
      if (e.key === 'nara_booking_sync_timestamp' || e.key === 'nara_ops_updated') {
        fetchJob(true);
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        fetchJob(true);
      }
    };

    window.addEventListener('nara-booking-updated', handleSync);
    window.addEventListener('nara-technician-sync', handleSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener('nara-booking-updated', handleSync);
      window.removeEventListener('nara-technician-sync', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authLoading, user, fetchJob]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (beforePhoto.preview) URL.revokeObjectURL(beforePhoto.preview);
      if (afterPhoto.preview) URL.revokeObjectURL(afterPhoto.preview);
    };
  }, []);

  const updateStatus = async (endpoint) => {
    try {
      setUpdating(true);
      await api.patch(`/technician/jobs/${id}/${endpoint}`);
      await fetchJob();
      window.dispatchEvent(new CustomEvent('nara-booking-updated'));
      localStorage.setItem('nara_booking_sync_timestamp', Date.now().toString());
      if (endpoint === 'start') {
        setWorkStep('before_photo');
        showSuccess('Pekerjaan dimulai. Silakan ambil foto kondisi awal unit AC.');
      } else if (endpoint === 'complete') {
        showSuccess('Selamat! Pekerjaan servis AC berhasil diselesaikan.');
      }
    } catch (err) {
      const pendingList = err.response?.data?.error?.details?.checklist_pending;
      if (pendingList && pendingList.length > 0) {
        showError(`Masih ada checklist wajib yang belum selesai: ${pendingList.join(', ')}`);
      } else {
        showError(err.response?.data?.error?.message || err.error?.message || err?.message || 'Gagal mengubah status');
      }
    } finally {
      setUpdating(false);
    }
  };

  // Immediate optimistic update to eliminate screen flicker
  const handleToggleChecklist = async (checklistItem) => {
    const next = checklistItem.status === 'completed' ? 'pending' : 'completed';

    // 1. Instant optimistic state update
    setJob(prev => {
      if (!prev) return prev;
      const updatedChecklists = (prev.checklists || []).map(item => 
        item.id === checklistItem.id ? { ...item, status: next } : item
      );
      return { ...prev, checklists: updatedChecklists };
    });

    try {
      await api.patch(`/technician/jobs/${id}/checklist/${checklistItem.id}`, { status: next });
      // Silent sync without full page reload/spinner
      await fetchJob(true);
      window.dispatchEvent(new CustomEvent('nara-booking-updated'));
      localStorage.setItem('nara_booking_sync_timestamp', Date.now().toString());
    } catch (err) {
      // Revert if error
      setJob(prev => {
        if (!prev) return prev;
        const revertedChecklists = (prev.checklists || []).map(item => 
          item.id === checklistItem.id ? { ...item, status: checklistItem.status } : item
        );
        return { ...prev, checklists: revertedChecklists };
      });
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal mengubah status checklist');
    }
  };

  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await api.post(`/technician/jobs/${id}/checklist`, { task: newTask.trim(), wajib: false });
      setNewTask('');
      await fetchJob(true);
      showSuccess('Item checklist berhasil ditambahkan');
    } catch (err) {
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal menambah item checklist');
    }
  };

  const handleInitDefaultChecklist = async () => {
    try {
      setUpdating(true);
      for (const item of STANDARD_SOP) {
        await api.post(`/technician/jobs/${id}/checklist`, { task: item.task, wajib: item.wajib });
      }
      await fetchJob();
      showSuccess('SOP Standar berhasil dimuat');
    } catch (err) {
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal memuat SOP');
    } finally {
      setUpdating(false);
    }
  };

  // Photo handlers
  const handleSelectPhotoFile = (file, type) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (type === 'before') {
      if (beforePhoto.preview) URL.revokeObjectURL(beforePhoto.preview);
      setBeforePhoto({ file, preview: previewUrl });
    } else {
      if (afterPhoto.preview) URL.revokeObjectURL(afterPhoto.preview);
      setAfterPhoto({ file, preview: previewUrl });
    }
  };

  const handleClearSelectedPhoto = (type) => {
    if (type === 'before') {
      if (beforePhoto.preview) URL.revokeObjectURL(beforePhoto.preview);
      setBeforePhoto({ file: null, preview: '' });
      if (beforeFileInputRef.current) beforeFileInputRef.current.value = '';
    } else {
      if (afterPhoto.preview) URL.revokeObjectURL(afterPhoto.preview);
      setAfterPhoto({ file: null, preview: '' });
      if (afterFileInputRef.current) afterFileInputRef.current.value = '';
    }
  };

  const handleUploadPhoto = async (type) => {
    const photoState = type === 'before' ? beforePhoto : afterPhoto;
    if (!photoState.file) {
      showError('Pilih atau ambil foto terlebih dahulu.');
      return;
    }
    try {
      setUpdating(true);
      const body = new FormData();
      body.append('tipe', type);
      body.append('foto', photoState.file);
      await api.post(`/technician/jobs/${id}/photos`, body);
      showSuccess(`Foto ${type === 'before' ? 'sebelum' : 'sesudah'} pengerjaan berhasil diunggah.`);
      handleClearSelectedPhoto(type);
      await fetchJob();
      window.dispatchEvent(new CustomEvent('nara-booking-updated'));
      localStorage.setItem('nara_booking_sync_timestamp', Date.now().toString());
    } catch (err) {
      showError(err.error?.message || err.response?.data?.error?.message || 'Gagal mengunggah foto');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUploadedPhoto = async (photoId) => {
    if (!window.confirm('Hapus foto dokumentasi ini?')) return;
    try {
      setUpdating(true);
      await api.delete(`/technician/jobs/${id}/photos/${photoId}`);
      showSuccess('Foto dokumentasi berhasil dihapus.');
      await fetchJob();
    } catch (err) {
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal menghapus foto.');
    } finally {
      setUpdating(false);
    }
  };

  const addMaterial = async (e) => {
    e.preventDefault();
    if (!materialId || !materialQty) return;
    try {
      await api.post(`/technician/jobs/${id}/materials`, { item_id: parseInt(materialId), jumlah: parseFloat(materialQty) });
      setMaterialId('');
      setMaterialQty('');
      await fetchJob(true);
      showSuccess('Material berhasil ditambahkan');
    } catch (err) {
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal menambah material');
    }
  };

  const saveWorkOrder = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/technician/jobs/${id}/work-order`, workOrder);
      await fetchJob(true);
      showSuccess('Catatan tersimpan');
    } catch (err) {
      showError(err.error?.message || 'Gagal menyimpan catatan');
    }
  };

  const handleReportDelay = async (e) => {
    e.preventDefault();
    if (!delayReason.trim()) {
      showError('Mohon isi alasan keterlambatan.');
      return;
    }
    try {
      setReportingDelay(true);
      await api.post(`/technician/jobs/${id}/delay`, {
        kategori: delayCategory,
        alasan: delayReason.trim(),
        durasi_tunggu_menit: parseInt(delayWaitMinutes, 10) || 0,
      });
      showSuccess('Laporan keterlambatan berhasil dikirim ke Admin & Pelanggan.');
      setShowDelayModal(false);
      setDelayReason('');
      setDelayCategory('macet');
      await fetchJob();
      window.dispatchEvent(new CustomEvent('nara-booking-updated'));
      localStorage.setItem('nara_booking_sync_timestamp', Date.now().toString());
    } catch (err) {
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal melaporkan kendala');
    } finally {
      setReportingDelay(false);
    }
  };

  const photoSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_ORIGIN}${url}`;
  };

  const formatIndonesianDate = (dateString, includeTime = true) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      }) + (includeTime ? ' WIB' : '');
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (authLoading || loading || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-spin text-blue-600 w-8 h-8"><RefreshCw className="w-full h-full" /></div>
      </div>
    );
  }

  const beforePhotos = job.photos?.filter(p => p.tipe === 'before') || [];
  const afterPhotos = job.photos?.filter(p => p.tipe === 'after') || [];
  const hasBefore = beforePhotos.length > 0;
  const hasAfter = afterPhotos.length > 0;
  const pendingWajibCount = job.checklists?.filter(c => c.wajib && c.status === 'pending').length || 0;
  const completedChecklistCount = job.checklists?.filter(c => c.status === 'completed').length || 0;
  const totalChecklistCount = job.checklists?.length || 0;

  // Stepper steps
  const steps = [
    {
      id: 1,
      name: 'Persiapan',
      subtitle: job.status === 'scheduled' ? 'Menunggu Jam' : 'Jadwal Siap',
      isCompleted: job.status !== 'scheduled',
      isCurrent: job.status === 'scheduled' || job.status === 'rescheduled' || job.status === 'delayed',
    },
    {
      id: 2,
      name: 'Foto Sebelum',
      subtitle: hasBefore ? 'Terverifikasi' : 'Wajib 1 Foto',
      isCompleted: hasBefore,
      isCurrent: job.status === 'on process' && workStep === 'before_photo',
    },
    {
      id: 3,
      name: 'Pengerjaan & SOP',
      subtitle: totalChecklistCount > 0 ? `${completedChecklistCount}/${totalChecklistCount} Selesai` : 'Checklist SOP',
      isCompleted: hasBefore && (workStep === 'after_photo' || hasAfter),
      isCurrent: job.status === 'on process' && workStep === 'checklist',
    },
    {
      id: 4,
      name: 'Foto Sesudah',
      subtitle: hasAfter ? 'Terverifikasi' : 'Wajib 1 Foto',
      isCompleted: hasAfter,
      isCurrent: job.status === 'on process' && workStep === 'after_photo' && !hasAfter,
    },
    {
      id: 5,
      name: 'Selesai',
      subtitle: job.status === 'done' ? 'Telah Selesai' : 'Finalisasi Order',
      isCompleted: job.status === 'done',
      isCurrent: job.status === 'on process' && hasBefore && hasAfter && pendingWajibCount === 0,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-40">
      {/* Top Header - Cleaned & Tidy Alignment */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 p-3.5 sm:p-4 sticky top-0 z-20 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button 
              type="button" 
              onClick={handleBack} 
              className="p-2 -ml-1 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0" 
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[180px] sm:max-w-xs md:max-w-md" title={job.kode_booking}>
                  {job.kode_booking}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide shrink-0 ${
                  job.status === 'on process'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : job.status === 'done'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {job.status === 'on process' ? 'On Process' : job.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {job.nama_layanan || 'Service AC'} • {job.nama_customer || job.nama || 'Pelanggan'}
              </p>
            </div>
          </div>

          {['scheduled', 'rescheduled', 'on process'].includes(job.status) && (
            <button
              type="button"
              onClick={() => setShowDelayModal(true)}
              className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Laporkan kendala / macet"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Lapor Kendala</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        
        {/* ENHANCED WORKFLOW TIMELINE STEPPER */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Alur Kerja &amp; Progres Pengerjaan</span>
            </h2>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {job.status === 'done' ? '100% Selesai' : job.status === 'on process' ? (hasAfter ? '80% Hampir Selesai' : hasBefore ? '50% Dikerjakan' : '25% Mulai') : '10% Persiapan'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1 sm:gap-2 relative">
            {steps.map((st, index) => {
              const isPast = st.isCompleted;
              const isCurrent = st.isCurrent;

              return (
                <div 
                  key={st.id} 
                  onClick={() => {
                    if (job.status === 'on process') {
                      if (st.id === 2) setWorkStep('before_photo');
                      if (st.id === 3 && hasBefore) setWorkStep('checklist');
                      if (st.id === 4 && hasBefore) setWorkStep('after_photo');
                    }
                  }}
                  className={`flex flex-col items-center text-center relative group ${
                    job.status === 'on process' && (st.id === 2 || (hasBefore && (st.id === 3 || st.id === 4))) ? 'cursor-pointer' : ''
                  }`}
                  title={
                    job.status === 'on process' && (st.id === 2 || (hasBefore && (st.id === 3 || st.id === 4)))
                      ? `Buka tahap ${st.name}` 
                      : undefined
                  }
                >
                  {/* Connector line between steps */}
                  {index < steps.length - 1 && (
                    <div 
                      className={`hidden sm:block absolute top-4 left-1/2 w-full h-1 -translate-y-1/2 z-0 ${
                        isPast ? 'bg-emerald-500' : 'bg-slate-200'
                      }`} 
                    />
                  )}

                  {/* Step circle */}
                  <div className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ${
                    isPast
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/25 animate-pulse'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : st.id}
                  </div>

                  {/* Labels */}
                  <span className={`text-[10px] sm:text-xs font-bold mt-2 leading-tight ${
                    isCurrent ? 'text-blue-700 font-black' : isPast ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                  }`}>
                    {st.name}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium hidden sm:block mt-0.5">
                    {st.subtitle}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delay alert banner if job is marked as delayed */}
        {job.status === 'delayed' && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-bold">Pekerjaan Sedang Tertunda</p>
              <p className="text-xs text-amber-800 mt-1">{job.alasan_tunda || 'Pekerjaan ditandai mengalami keterlambatan operasional.'}</p>
            </div>
          </div>
        )}

        {/* Customer & Job Info Section */}
        <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-800">Detail Pelanggan &amp; Lokasi</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Jadwal: <strong className="text-slate-800">{formatIndonesianDate(job.jadwal_mulai)}</strong>
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-3.5 text-sm text-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-semibold uppercase">Pelanggan</span>
              <span className="font-bold text-slate-900">{job.nama_customer || job.nama || '-'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-semibold uppercase">Kontak WhatsApp</span>
              {job.kontak_customer ? (
                <a 
                  href={`https://wa.me/${String(job.kontak_customer).replace(/\D/g,'')}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200/80 flex items-center gap-1.5 text-xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> 
                  <span>{job.kontak_customer}</span>
                </a>
              ) : (
                <span className="text-slate-500">-</span>
              )}
            </div>

            <div className="flex justify-between items-start pt-1">
              <span className="text-slate-500 text-xs font-semibold uppercase shrink-0 pt-0.5">Alamat</span>
              <span className="font-medium text-slate-800 text-right flex items-start justify-end gap-1.5 text-xs sm:text-sm pl-4">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{job.alamat}</span>
              </span>
            </div>

            {job.brand && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-semibold uppercase">Unit AC Terdaftar</span>
                <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {job.brand} {job.model || ''} ({job.kapasitas_pk || '1/2 PK'}) - {job.lokasi || 'Indoor'}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 text-xs font-semibold uppercase">Keluhan Pelanggan</span>
                <span className="font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs max-w-[70%] text-right">
                  {job.keluhan || 'Tidak ada keluhan khusus'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 1: FOTO SEBELUM PENGERJAAN (BEFORE) */}
        {job.status === 'on process' && workStep === 'before_photo' && (
          <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-blue-50/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4.5 h-4.5 text-blue-600" />
                <div>
                  <h2 className="font-bold text-sm text-blue-900">Foto Sebelum Pengerjaan (Before)</h2>
                  <p className="text-[11px] text-blue-700">Dokumentasi kondisi awal sebelum unit AC disentuh / dibongkar.</p>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                hasBefore ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                {hasBefore ? `${beforePhotos.length} Foto Terunggah` : 'Wajib 1 Foto'}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Action Banner to Proceed to Checklist when at least 1 photo uploaded */}
              {hasBefore && (
                <div className="pb-1">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-4 rounded-2xl border border-blue-200/90 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {beforePhotos.length} Foto Sebelum Tersimpan
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Kondisi awal telah didokumentasikan. Klik tombol untuk lanjut ke checklist SOP.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWorkStep('checklist')}
                      className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
                    >
                      <span>Lanjut ke Halaman Berikutnya (Checklist)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Display existing uploaded before photos */}
              {hasBefore && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Foto yang Sudah Tersimpan</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {beforePhotos.map((p) => (
                      <div key={p.id} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs">
                        <img src={photoSrc(p.url_foto)} alt="Foto Sebelum" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setLightboxImg({ url: photoSrc(p.url_foto), title: 'Foto Sebelum Pengerjaan' })}
                            className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white transition-colors cursor-pointer"
                            title="Perbesar Foto"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                          {job.status !== 'done' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUploadedPhoto(p.id)}
                              className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                              title="Hapus Foto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] font-bold p-1 text-center truncate">
                          Sebelum ({formatIndonesianDate(p.waktu, true)})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview of newly selected/captured photo */}
              {beforePhoto.preview ? (
                <div className="bg-slate-50 border-2 border-blue-500/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      Preview Foto Baru (Siap Diunggah)
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {beforePhoto.file?.name} ({formatFileSize(beforePhoto.file?.size)})
                    </span>
                  </div>

                  <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden border border-slate-200 bg-black shadow-md">
                    <img 
                      src={beforePhoto.preview} 
                      alt="Preview Foto Sebelum" 
                      className="w-full h-full object-contain" 
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUploadPhoto('before')}
                      disabled={updating}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      <span>Unggah Foto Sebelum</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => beforeFileInputRef.current?.click()}
                      disabled={updating}
                      className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Ganti Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSelectedPhoto('before')}
                      disabled={updating}
                      className="px-4 py-3 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                /* Single clean direct upload column/box */
                <div>
                  <div
                    onClick={() => beforeFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer group bg-slate-50/50"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                      {hasBefore ? '+ Ambil / Tambah Foto Kondisi Awal Lainnya' : 'Klik untuk Ambil Foto atau Pilih dari Galeri'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Kamera langsung atau galeri perangkat
                    </p>
                  </div>

                  <input
                    ref={beforeFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSelectPhotoFile(e.target.files?.[0], 'before')}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* STEP 2: CHECKLIST SOP & MATERIAL (ACTIVE WHEN workStep === 'checklist') */}
        {job.status === 'on process' && workStep === 'checklist' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Back to Before Photo */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWorkStep('before_photo')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lihat / Tambah Foto Sebelum ({beforePhotos.length} foto)</span>
              </button>
              <span className="text-[11px] text-slate-500 font-medium">Langkah 2: Checklist &amp; Material</span>
            </div>

            {/* Checklist SOP */}
            <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-slate-600" />
                  <h2 className="font-bold text-sm text-slate-800">Checklist SOP Standar CV. Nara AC</h2>
                </div>
                {job.checklists && job.checklists.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {completedChecklistCount} / {totalChecklistCount} Selesai
                    </span>
                    {pendingWajibCount > 0 && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {pendingWajibCount} Wajib Belum
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5">
                {(!job.checklists || job.checklists.length === 0) ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500 mb-3 font-medium">Belum ada item checklist untuk pekerjaan ini.</p>
                    <button
                      type="button"
                      onClick={handleInitDefaultChecklist}
                      disabled={updating}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Inisialisasi SOP Standar (7 Langkah Wajib)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {job.checklists.map(item => {
                      const isDone = item.status === 'completed';
                      return (
                        <label 
                          htmlFor={`chk-${item.id}`} 
                          key={item.id} 
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            isDone 
                              ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/70' 
                              : item.wajib 
                                ? 'bg-white border-amber-300 hover:border-amber-400 hover:bg-amber-50/40 shadow-2xs' 
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            id={`chk-${item.id}`} 
                            type="checkbox" 
                            checked={isDone} 
                            onChange={() => handleToggleChecklist(item)}
                            className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className={`text-xs sm:text-sm flex-1 ${isDone ? 'text-slate-400 line-through font-medium' : 'text-slate-800 font-bold'}`}>
                            {item.task}
                          </span>
                          {item.wajib ? (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              Wajib
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              Opsional
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleAddChecklist} className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    placeholder="Tambah catatan/langkah SOP tambahan..."
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    className="flex-1 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 px-3 py-2"
                  />
                  <button
                    type="submit"
                    disabled={!newTask.trim()}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    + Tambah
                  </button>
                </form>
              </div>
            </section>

            {/* Suku Cadang & Material */}
            <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-600" />
                  <h2 className="font-bold text-sm text-slate-800">Material &amp; Suku Cadang yang Dipakai</h2>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Kesepakatan di Lokasi
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <ul className="space-y-2.5 mb-4 text-sm">
                  {job.materials?.map(m => (
                    <li key={m.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-800 text-xs sm:text-sm">{m.nama}</span>
                      <span className="text-slate-600 bg-white font-bold px-2.5 py-1 rounded-lg text-xs border border-slate-200">
                        {m.jumlah} {m.satuan}
                      </span>
                    </li>
                  ))}
                  {(!job.materials || job.materials.length === 0) && (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl text-center">Belum ada material/suku cadang tambahan.</p>
                  )}
                </ul>

                <form onSubmit={addMaterial} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                  <select 
                    value={materialId} 
                    onChange={e=>setMaterialId(e.target.value)} 
                    className="flex-1 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 p-2.5 bg-white"
                  >
                    <option value="">Pilih Suku Cadang / Freon...</option>
                    {Array.isArray(inventory) && inventory.map(item => (
                      <option key={item.id} value={item.id}>{item.nama} (Stok: {item.stok} {item.satuan})</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Jumlah" 
                      step="0.1" 
                      value={materialQty} 
                      onChange={e=>setMaterialQty(e.target.value)} 
                      className="w-24 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 p-2.5" 
                    />
                    <button 
                      type="submit" 
                      disabled={!materialId || !materialQty}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Tambah
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* Catatan Teknisi */}
            <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardEdit className="w-4 h-4 text-slate-600" />
                  <h2 className="font-bold text-sm text-slate-800">Catatan Pengerjaan Teknisi</h2>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <form onSubmit={saveWorkOrder} className="space-y-3">
                  <textarea
                    value={workOrder.catatan}
                    onChange={e => setWorkOrder({ ...workOrder, catatan: e.target.value })}
                    placeholder="Contoh: Tekanan freon awal 60 psi diisi ke 75 psi, unit outdoor dibersihkan tuntas..."
                    className="w-full text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 p-3 min-h-[80px]"
                  />
                  <button 
                    type="submit" 
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> 
                    <span>Simpan Catatan Servis</span>
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}

        {/* STEP 3: FOTO SESUDAH PENGERJAAN (ACTIVE WHEN workStep === 'after_photo') */}
        {job.status === 'on process' && hasBefore && workStep === 'after_photo' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Top Back to Checklist Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWorkStep('checklist')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Checklist SOP ({completedChecklistCount}/{totalChecklistCount})</span>
              </button>
              {pendingWajibCount > 0 && (
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                  {pendingWajibCount} SOP Wajib Belum
                </span>
              )}
            </div>

            <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-emerald-50/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4.5 h-4.5 text-emerald-600" />
                  <div>
                    <h2 className="font-bold text-sm text-emerald-950">Foto Sesudah Pengerjaan (After)</h2>
                    <p className="text-[11px] text-emerald-700">Dokumentasi hasil akhir setelah AC bersih &amp; running test normal.</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  hasAfter ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {hasAfter ? `${afterPhotos.length} Foto Terunggah` : 'Wajib 1 Foto'}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Display existing uploaded after photos */}
                {hasAfter && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Foto yang Sudah Tersimpan</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {afterPhotos.map((p) => (
                        <div key={p.id} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs">
                          <img src={photoSrc(p.url_foto)} alt="Foto Sesudah" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLightboxImg({ url: photoSrc(p.url_foto), title: 'Foto Sesudah Pengerjaan' })}
                              className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white transition-colors cursor-pointer"
                              title="Perbesar Foto"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                            {job.status !== 'done' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUploadedPhoto(p.id)}
                                className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                                title="Hapus Foto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] font-bold p-1 text-center truncate">
                            Sesudah ({formatIndonesianDate(p.waktu, true)})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview of newly selected/captured after photo */}
                {afterPhoto.preview ? (
                  <div className="bg-slate-50 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        Preview Foto Hasil (Siap Diunggah)
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {afterPhoto.file?.name} ({formatFileSize(afterPhoto.file?.size)})
                      </span>
                    </div>

                    <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden border border-slate-200 bg-black shadow-md">
                      <img 
                        src={afterPhoto.preview} 
                        alt="Preview Foto Sesudah" 
                        className="w-full h-full object-contain" 
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUploadPhoto('after')}
                        disabled={updating}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                        <span>Unggah Foto Sesudah</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => afterFileInputRef.current?.click()}
                        disabled={updating}
                        className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Ganti Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearSelectedPhoto('after')}
                        disabled={updating}
                        className="px-4 py-3 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Single clean direct upload column/box */
                  <div>
                    <div
                      onClick={() => afterFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer group bg-slate-50/50"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {hasAfter ? '+ Ambil / Tambah Foto Hasil Servis Lainnya' : 'Klik untuk Ambil Foto atau Pilih dari Galeri'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Kamera langsung atau galeri perangkat
                      </p>
                    </div>

                    <input
                      ref={afterFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSelectPhotoFile(e.target.files?.[0], 'after')}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* COMPLETED JOB VIEW */}
        {job.status === 'done' && (
          <>
            <section className="bg-white rounded-2xl shadow-xs border border-emerald-200/80 overflow-hidden text-center p-8 bg-gradient-to-b from-emerald-50/50 to-white">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="font-black text-xl text-slate-900 mb-1">Pekerjaan Selesai</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Seluruh SOP pengerjaan, verifikasi foto dokumentasi, dan rekonsiliasi material telah selesai dan terekam di sistem.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-full">
                <span>Waktu Selesai: {formatIndonesianDate(job.selesai_aktual || job.updated_at)}</span>
              </div>
            </section>

            {/* Documentation photos grid */}
            <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-600" />
                  <h2 className="font-bold text-sm text-slate-800">Dokumentasi Foto Sebelum &amp; Sesudah</h2>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Total: {job.photos?.length || 0} Foto
                </span>
              </div>
              <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {job.photos?.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setLightboxImg({ url: photoSrc(p.url_foto), title: `Foto ${p.tipe === 'before' ? 'Sebelum' : 'Sesudah'}` })}
                    className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group shadow-2xs"
                  >
                    <img src={photoSrc(p.url_foto)} alt={p.tipe} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white" />
                    </div>
                    <div className={`absolute bottom-0 left-0 right-0 text-white text-[10px] p-1 text-center font-bold capitalize ${
                      p.tipe === 'before' ? 'bg-blue-600/80' : 'bg-emerald-600/80'
                    }`}>
                      {p.tipe === 'before' ? 'Sebelum' : 'Sesudah'}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

      </main>

      {/* Floating Bottom Action Bar */}
      {job.status !== 'done' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg z-20">
          <div className="max-w-3xl mx-auto flex justify-end">
            {['scheduled', 'rescheduled', 'delayed'].includes(job.status) && (
              <button 
                type="button"
                onClick={() => updateStatus('start')} 
                disabled={updating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer text-sm"
              >
                {updating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                <span>Mulai Pengerjaan Unit</span>
              </button>
            )}
            
            {job.status === 'on process' && (
              <div className="w-full">
                {workStep === 'before_photo' && (
                  <button 
                    type="button"
                    onClick={() => setWorkStep('checklist')} 
                    disabled={!hasBefore}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-40 disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer disabled:cursor-not-allowed text-sm"
                    title={!hasBefore ? 'Harap unggah minimal 1 foto kondisi awal terlebih dahulu' : undefined}
                  >
                    <span>Lanjut ke Checklist Pengerjaan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {workStep === 'checklist' && (
                  <div className="w-full flex gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setWorkStep('before_photo')}
                      className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs sm:text-sm shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Foto Sebelum</span>
                      <span className="sm:hidden">Kembali</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setWorkStep('after_photo')} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer text-sm"
                    >
                      <span>Lanjut ke Foto Sesudah</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {workStep === 'after_photo' && (
                  <div className="w-full flex flex-col gap-2">
                    {hasAfter && pendingWajibCount > 0 && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2 text-center font-bold">
                        ⚠️ Masih ada {pendingWajibCount} item SOP wajib yang belum dicentang.
                      </p>
                    )}
                    <div className="flex gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setWorkStep('checklist')}
                        className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs sm:text-sm shrink-0"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Checklist SOP</span>
                        <span className="sm:hidden">Kembali</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateStatus('complete')} 
                        disabled={updating || !hasAfter || pendingWajibCount > 0}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer disabled:cursor-not-allowed text-sm"
                      >
                        {updating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        <span>Selesaikan Pekerjaan (Order Selesai)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {lightboxImg && (
        <div 
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex justify-between items-center text-white mb-2">
              <span className="text-xs font-bold">{lightboxImg.title}</span>
              <button 
                type="button"
                onClick={() => setLightboxImg(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img 
              src={lightboxImg.url} 
              alt={lightboxImg.title} 
              className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10" 
            />
          </div>
        </div>
      )}

      {/* Delay / Kendala Report Modal */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Laporkan Kendala / Keterlambatan</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowDelayModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportDelay} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kategori Kendala</label>
                <select
                  value={delayCategory}
                  onChange={e => setDelayCategory(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="macet">Lalu Lintas / Macet di Jalan</option>
                  <option value="cuaca_buruk">Cuaca Buruk / Hujan Lebat</option>
                  <option value="pelanggan_tidak_di_tempat">Akses Lokasi / Rumah Pelanggan Belum Siap</option>
                  <option value="pekerjaan_sebelumnya_molor">Pekerjaan Sebelumnya Melebihi Estimasi</option>
                  <option value="kendala_teknis">Kendala Teknis Peralatan / Kendaraan</option>
                  <option value="kendala_peralatan">Kendala Peralatan Kerja</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Estimasi Waktu Tunggu / Terlambat (Menit)</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={delayWaitMinutes}
                  onChange={e => setDelayWaitMinutes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan Tambahan</label>
                <textarea
                  required
                  value={delayReason}
                  onChange={e => setDelayReason(e.target.value)}
                  placeholder="Contoh: Terjebak macet perbaikan jalan di Jl. Pemuda, estimasi tiba 20 menit lagi..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-3 min-h-[70px] focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={reportingDelay}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {reportingDelay ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>Kirim Laporan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
