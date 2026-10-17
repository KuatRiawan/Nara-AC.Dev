import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, RefreshCw, SwitchCamera, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from './button';

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Ambil Foto via Kamera',
  description = 'Arahkan kamera ke unit AC dan pastikan kondisi terlihat jelas.',
}) {
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState('');
  const [isShutterActive, setIsShutterActive] = useState(false);

  const videoRef = useRef(null);
  const fileFallbackInputRef = useRef(null);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async (preferredFacing = facingMode) => {
    stopStream();
    setCameraError('');
    setCapturedBlob(null);
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl('');
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Browser Anda tidak mendukung akses kamera langsung. Silakan pilih foto dari galeri/berkas.');
      return;
    }

    try {
      // Check multiple cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (_) {}

      const constraints = {
        video: {
          facingMode: { ideal: preferredFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser atau pilih foto dari perangkat.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Perangkat kamera tidak ditemukan pada sistem Anda.');
      } else {
        setCameraError('Gagal menghubungkan ke kamera browser: ' + (err.message || 'Error tidak diketahui'));
      }
    }
  }, [facingMode, stopStream, capturedUrl]);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
      if (capturedUrl) {
        URL.revokeObjectURL(capturedUrl);
        setCapturedUrl('');
      }
      setCapturedBlob(null);
      setCameraError('');
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Connect video srcObject when stream or videoRef changes
  useEffect(() => {
    if (videoRef.current && stream && !capturedBlob) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, capturedBlob]);

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Trigger visual shutter flash
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 200);

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const preview = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedUrl(preview);
      stopStream();
    }, 'image/jpeg', 0.92);
  };

  const handleRetake = () => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl('');
    }
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  const handleConfirmPhoto = () => {
    if (!capturedBlob) return;
    const fileName = `foto_kamera_${Date.now()}.jpg`;
    const file = new File([capturedBlob], fileName, { type: 'image/jpeg' });
    onCapture(file);
    onClose();
  };

  const handleFallbackFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-white max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 id="camera-modal-title" className="text-sm font-bold text-white leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-400">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Kamera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative bg-black flex-1 min-h-[300px] sm:min-h-[380px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-4 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-300">Tidak Dapat Mengakses Kamera</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{cameraError}</p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => fileFallbackInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Pilih dari Berkas / Galeri</span>
                </Button>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="text-xs text-slate-400 hover:text-white py-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Akses Kamera Lagi</span>
                </button>
              </div>
            </div>
          ) : capturedBlob && capturedUrl ? (
            /* Review captured photo */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedUrl}
                alt="Hasil Jepretan"
                className="max-h-[60vh] w-auto object-contain rounded-lg"
              />
              <div className="absolute top-3 left-3 bg-emerald-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Foto Berhasil Diambil</span>
              </div>
            </div>
          ) : (
            /* Live camera viewfinder */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover max-h-[60vh]"
              />

              {/* Viewfinder guides */}
              <div className="absolute inset-6 sm:inset-10 border-2 border-white/30 border-dashed rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400 -mt-1 -ml-1 rounded-tl" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400 -mt-1 -mr-1 rounded-tr" />
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400 -mb-1 -ml-1 rounded-bl" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400 -mb-1 -mr-1 rounded-br" />
                </div>
              </div>

              {/* Status badge */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE VIEW</span>
              </div>

              {/* Switch camera button */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all cursor-pointer"
                  title="Ganti Kamera Depan/Belakang"
                  aria-label="Ganti Kamera Depan/Belakang"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}

              {/* Shutter flash animation */}
              {isShutterActive && (
                <div className="absolute inset-0 bg-white opacity-80 animate-out fade-out duration-200 pointer-events-none" />
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-3">
          {capturedBlob ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Foto Ulang</span>
              </button>
              <Button
                type="button"
                onClick={handleConfirmPhoto}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Gunakan Foto Ini</span>
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileFallbackInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
                title="Pilih foto dari galeri/berkas"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Pilih dari Galeri</span>
              </button>

              <div className="flex-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleTakeSnapshot}
                  disabled={!!cameraError || !stream}
                  className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center p-1 bg-white/20 hover:bg-white/40 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-lg group"
                  aria-label="Jepret Foto"
                  title="Jepret Foto"
                >
                  <div className="w-full h-full rounded-full bg-white group-hover:scale-90 transition-transform" />
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
            </>
          )}
        </div>

        {/* Hidden file input for fallback */}
        <input
          ref={fileFallbackInputRef}
          type="file"
          accept="image/*,image/png,image/jpeg,image/webp"
          onChange={handleFallbackFileSelect}
          className="hidden"
        />
      </div>
    </div>,
    document.body
  );
}
