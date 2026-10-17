import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Wind, RefreshCw, Phone, ArrowLeft, Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

export default function OfflinePage() {
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [score, setScore] = useState(0);

  const canvasRef = useRef(null);
  const gameRef = useRef({ running: false, animId: null, player: null, items: [], lastSpawn: 0 });

  useEffect(() => {
    document.title = 'Mode Offline | NARA AC';
  }, []);

  const handleCheckConnection = async () => {
    setIsChecking(true);
    setStatusMessage('Memeriksa sinyal internet...');
    try {
      const res = await fetch('/images/logo.png?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      if (res.ok) {
        setStatusMessage('Koneksi internet terhubung kembali!');
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      } else {
        setStatusMessage('Masih belum ada koneksi internet.');
      }
    } catch {
      setStatusMessage('Masih offline. Periksa koneksi Wi-Fi atau paket data Anda.');
    } finally {
      setIsChecking(false);
    }
  };

  // Mini-Game Logic
  useEffect(() => {
    if (!isGameOpen) {
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
  }, [isGameOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-sky-100 px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <CompanyLogo className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              <span>Mode Offline</span>
            </span>
            <Link
              to="/"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200/80"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ke Beranda</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white border border-sky-100 rounded-3xl p-6 sm:p-8 text-center shadow-[0_20px_45px_-12px_rgba(14,165,233,0.18),0_4px_16px_-2px_rgba(15,23,42,0.04)]">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-500/10">
            <Wind className="w-10 h-10 animate-pulse" />
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
            Koneksi Sedang Terputus
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Tenang, AC Anda tetap dingin! Sinyal internet sedang offline. Tekan tombol di bawah untuk menyambungkan kembali atau mainkan mini-game sambil menunggu koneksi stabil.
          </p>

          <button
            type="button"
            onClick={handleCheckConnection}
            disabled={isChecking}
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Memeriksa Sinyal...' : 'Coba Hubungkan Kembali'}</span>
          </button>

          {statusMessage && (
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium animate-fadeIn">
              {statusMessage}
            </div>
          )}

          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-700">
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
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 text-center py-4 border-t border-slate-200/60 bg-white text-xs text-slate-400">
        © 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}
