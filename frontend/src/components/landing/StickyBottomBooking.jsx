import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CalendarCheck, Phone, ArrowRight, X, Bot } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import ChatbotWidget from '../ChatbotWidget';
import { useBusinessProfile, buildWhatsAppUrl } from '../../hooks/useBusinessProfile';

export default function StickyBottomBooking() {
  const shouldReduceMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { whatsappNumber } = useBusinessProfile();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showExpandedDock = isScrolled && !isMinimized;

  return (
    <>
      <ChatbotWidget
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        hideFloatingButton={true}
      />

      <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 pointer-events-auto">
        <AnimatePresence mode="wait">
          {showExpandedDock ? (
            <motion.div
              key="dock-expanded"
              initial={shouldReduceMotion ? { opacity: 1 } : { y: 30, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { y: 30, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white/95 text-slate-800 p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-sky-200 backdrop-blur-xl shadow-xl shadow-blue-900/10 flex items-center justify-between gap-3 sm:gap-4 transition-all max-w-[calc(100vw-2rem)] sm:max-w-xl"
            >
              <div className="flex items-center gap-2.5 pl-1.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    AC Kurang Dingin?
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    Slot teknisi tersedia hari ini
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsChatOpen((prev) => !prev)}
                  className={cn(
                    'h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border',
                    isChatOpen
                      ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-500/20'
                      : 'bg-sky-50 hover:bg-blue-50 border-sky-200 text-blue-700'
                  )}
                  title="Tanya AI Asisten Nara AC"
                >
                  <Bot className="w-4 h-4 text-blue-600" />
                  <span className="hidden xs:inline">Tanya AI</span>
                </button>

                <a
                  href={buildWhatsAppUrl(whatsappNumber, 'Halo NARA AC, saya ingin konsultasi jadwal servis AC')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Chat WhatsApp"
                >
                  <Phone className="w-4 h-4" />
                  <span className="sr-only"> (buka di tab baru)</span>
                </a>

                <Link to="/booking">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-3 sm:px-3.5 rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1 group"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Booking</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                  aria-label="Kecilkan bar"
                  title="Kecilkan bar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dock-collapsed"
              initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative group"
            >
              <button
                type="button"
                onClick={() => {
                  if (isChatOpen) {
                    setIsChatOpen(false);
                  } else {
                    setIsChatOpen(true);
                    setIsMinimized(false);
                  }
                }}
                className={cn(
                  'relative w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 cursor-pointer border border-white/30',
                  isChatOpen
                    ? 'bg-blue-700 text-white scale-95 ring-2 ring-sky-300'
                    : 'bg-gradient-to-tr from-blue-600 via-sky-500 to-blue-600 text-white hover:scale-105 shadow-blue-600/35'
                )}
                aria-label={isChatOpen ? 'Tutup chat asisten' : 'Buka Asisten Nara AC & Booking'}
              >
                {isChatOpen ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Bot className="w-6 h-6 text-white" />
                )}

                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                </span>
              </button>

              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-lg border border-blue-500 whitespace-nowrap pointer-events-none">
                <span>Tanya AI &amp; Cek Slot Teknisi</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
