import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, Eye, EyeOff, Wind, Phone } from 'lucide-react';

export default function OfflineBanner() {
  const location = useLocation();
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });

  const [minimized, setMinimized] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Game state
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [score, setScore] = useState(0);
  const canvasRef = useRef(null);
  const gameRef = useRef({ running: false, animId: null, player: null, items: [], lastSpawn: 0 });

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/favicon.ico?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      if (res.ok) {
        setIsOffline(false);
        setMinimized(false);
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3500);
      } else {
        setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Active connectivity heartbeat & browser event listeners
  useEffect(() => {
    let intervalId = null;

    const pingCheck = async () => {
      // If browser reports offline, mark offline immediately
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        return;
      }
      try {
        const res = await fetch('/favicon.ico?_ping=' + Date.now(), {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (res.ok) {
          setIsOffline((prev) => {
            if (prev) {
              setShowRestored(true);
              setTimeout(() => setShowRestored(false), 3500);
            }
            return false;
          });
        }
      } catch {
        // Failed network request (DevTools offline or real network drop)
        setIsOffline(true);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setMinimized(false);
      setWasOffline(true);
    };

    const handleOnline = () => {
      pingCheck();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Active heartbeat check every 4.5 seconds
    intervalId = setInterval(pingCheck, 4500);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Don't render banner overlay if user is already on the dedicated /offline page
  if (location.pathname === '/offline') {
    return null;
  }

  // Mini-Game Logic
  useEffect(() => {
    if (!isGameOpen || !isOffline || minimized) {
      if (gameRef.current.animId) {
        cancelAnimationFrame(gameRef.current.animId);
      }
      gameRef.current.running = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;

    g.running = true;
    g.player = {
      x: canvas.width / 2 - 28,
      y: canvas.height - 24,
      width: 56,
      height: 16,
    };
    g.items = [];
    g.lastSpawn = Date.now();
    setScore(0);

    const updatePlayerPos = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const targetX = (clientX - rect.left) * scaleX - g.player.width / 2;
      g.player.x = Math.max(0, Math.min(canvas.width - g.player.width, targetX));
    };

    let isDragging = false;
    const handleDown = (e) => {
      isDragging = true;
      updatePlayerPos(e.clientX);
    };
    const handleMove = (e) => {
      if (isDragging) updatePlayerPos(e.clientX);
    };
    const handleUp = () => {
      isDragging = false;
    };

    canvas.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    const loop = () => {
      if (!g.running) return;

      if (Date.now() - g.lastSpawn > 600) {
        g.items.push({
          x: Math.random() * (canvas.width - 24) + 12,
          y: -10,
          size: Math.random() * 8 + 8,
          speed: Math.random() * 2 + 2,
          isCold: Math.random() > 0.2,
        });
        g.lastSpawn = Date.now();
      }

      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1;
      ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

      // Player AC Unit
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(2, 132, 199, 0.2)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(g.player.x, g.player.y, g.player.width, g.player.height, 4);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(g.player.x + 8, g.player.y + 4, g.player.width - 16, 2);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(g.player.x + g.player.width - 8, g.player.y + 8, 2, 0, Math.PI * 2);
      ctx.fill();

      // Items
      for (let i = g.items.length - 1; i >= 0; i--) {
        const item = g.items[i];
        item.y += item.speed;

        if (
          item.y + item.size >= g.player.y &&
          item.y <= g.player.y + g.player.height &&
          item.x + item.size >= g.player.x &&
          item.x <= g.player.x + g.player.width
        ) {
          if (item.isCold) {
            setScore((prev) => prev + 10);
          } else {
            setScore((prev) => Math.max(0, prev - 5));
          }
          g.items.splice(i, 1);
          continue;
        }

        if (item.isCold) {
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(item.x, item.y, item.size * 0.8, item.size * 0.8);
        }

        if (item.y > canvas.height + 20) {
          g.items.splice(i, 1);
        }
      }

      g.animId = requestAnimationFrame(loop);
    };

    g.animId = requestAnimationFrame(loop);

    return () => {
      canvas.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (g.animId) cancelAnimationFrame(g.animId);
      g.running = false;
    };
  }, [isGameOpen, isOffline, minimized]);

  return (
    <aside aria-label="Status Koneksi Internet" aria-live="assertive">
      {/* 1. FULL OFFLINE SCREEN (Default when offline) */}
      <AnimatePresence>
        {isOffline && !minimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col justify-between overflow-y-auto selection:bg-blue-600 selection:text-white"
          >
            {/* Header */}
            <header className="shrink-0 bg-white border-b border-sky-100 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <img src="/images/logo.png" alt="NARA AC" className="w-8 h-8 object-contain" />
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-black text-blue-950" style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}>
                    NARA
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.2em] text-blue-600" style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}>
                    TEKNINDOTAMA
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                  <span>Mode Offline</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-slate-200/80"
                  title="Lihat halaman landing page yang sudah di-cache"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Halaman Cache</span>
                </button>
              </div>
            </header>

            {/* Center Content Card */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md bg-white border border-sky-100 rounded-3xl p-6 sm:p-8 text-center shadow-[0_20px_45px_-12px_rgba(14,165,233,0.18),0_4px_16px_-2px_rgba(15,23,42,0.04)]"
              >
                <div className="w-18 h-18 mx-auto mb-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-500/10">
                  <Wind className="w-9 h-9 animate-pulse" />
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
                  Koneksi Sedang Terputus
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
                  Tenang, AC Anda tetap dingin! Sinyal internet sedang offline. Tekan tombol di bawah untuk menyambungkan kembali atau nikmati mini-game sambil menunggu.
                </p>

                <button
                  type="button"
                  onClick={checkConnection}
                  disabled={isChecking}
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Memeriksa Sinyal...' : 'Coba Hubungkan Kembali'}</span>
                </button>

                <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-700">
                  <span className="font-medium">Butuh Servis Darurat?</span>
                  <a href="tel:081385293137" className="font-black text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>0813-8529-3137</span>
                  </a>
                </div>

                {/* Mini-Game Section */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsGameOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-50 hover:bg-sky-100 text-blue-700 text-xs font-bold border border-sky-200 transition-colors cursor-pointer"
                  >
                    <span>❄️</span>
                    <span>{isGameOpen ? 'Tutup Game' : 'Mainkan "Frosty AC Catch"'}</span>
                  </button>

                  {isGameOpen && (
                    <div className="mt-3">
                      <canvas
                        ref={canvasRef}
                        width={360}
                        height={170}
                        className="w-full h-auto bg-sky-50/70 border border-sky-200 rounded-2xl cursor-pointer touch-none select-none"
                      />
                      <div className="flex items-center justify-between mt-2 text-[11px] font-semibold text-slate-500">
                        <span>Geser unit AC untuk tangkap es</span>
                        <span className="text-blue-600 font-black">Skor: {score}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </main>

            {/* Footer */}
            <footer className="shrink-0 text-center py-3 border-t border-slate-200/60 bg-white/70 text-xs text-slate-400">
              © 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MINIMIZED FLOATING BANNER (When user toggles "Halaman Cache") */}
      <AnimatePresence>
        {isOffline && minimized && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-2rem)] max-w-lg px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-sm flex items-center justify-between gap-3 text-xs sm:text-sm select-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                <WifiOff className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 tracking-tight truncate">
                  Mode Offline Aktif
                </p>
                <p className="text-slate-500 text-xs truncate">
                  Melihat halaman tersimpan (cache).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMinimized(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Layar Offline</span>
              </button>
              <button
                type="button"
                onClick={checkConnection}
                disabled={isChecking}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Cek</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. CONNECTION RESTORED TOAST */}
      <AnimatePresence>
        {!isOffline && showRestored && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-2rem)] max-w-md px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-sm flex items-center gap-3 text-xs sm:text-sm select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-emerald-600">
              <Wifi className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Koneksi Kembali Terhubung</p>
              <p className="text-slate-500 text-xs truncate">Sistem online kembali secara otomatis.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
