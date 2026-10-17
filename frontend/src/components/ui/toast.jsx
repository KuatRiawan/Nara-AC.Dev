import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * UI/UX Pro Max - Clean Swiss Toast Design System
 * Strict Light Theme Consistency, High Contrast (WCAG AAA), 
 * Accessible Tap Targets, Spring Animations & Micro-Interactions.
 */
const TOAST_TYPES = {
  success: {
    icon: CheckCircle2,
    defaultTitle: 'Berhasil',
    badge: 'bg-emerald-50 text-emerald-600',
    progressBar: 'bg-emerald-500',
  },
  error: {
    icon: AlertCircle,
    defaultTitle: 'Terjadi Kendala',
    badge: 'bg-rose-50 text-rose-600',
    progressBar: 'bg-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    defaultTitle: 'Peringatan',
    badge: 'bg-amber-50 text-amber-600',
    progressBar: 'bg-amber-500',
  },
  info: {
    icon: Info,
    defaultTitle: 'Informasi',
    badge: 'bg-blue-50 text-blue-600',
    progressBar: 'bg-blue-500',
  },
};

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((msgOrOptions, type = 'info', duration = 4500) => {
    let toastData = {};
    if (typeof msgOrOptions === 'object' && msgOrOptions !== null) {
      toastData = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: msgOrOptions.type || type,
        message: msgOrOptions.message || '',
        title: msgOrOptions.title,
        duration: msgOrOptions.duration !== undefined ? msgOrOptions.duration : duration,
      };
    } else {
      toastData = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        message: String(msgOrOptions || ''),
        duration,
      };
    }
    setToasts(prev => [...prev, toastData]);
    return toastData.id;
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);
  const toast = useCallback((message, type, duration) => addToast(message, type, duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, toast, success, error, warning, info, dismissToast }}>
      {children}
      <aside 
        className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 w-full max-w-[390px] pointer-events-none px-4 sm:px-0"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Pemberitahuan Sistem"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <Toast key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
          ))}
        </AnimatePresence>
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function Toast({ toast, onDismiss }) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const typeConfig = TOAST_TYPES[toast.type] || TOAST_TYPES.info;
  const Icon = typeConfig.icon;
  const title = toast.title || typeConfig.defaultTitle;
  const duration = toast.duration ?? 4500;

  useEffect(() => {
    if (duration <= 0) return;

    const intervalTime = 25;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      if (!isPaused) {
        setProgress(prev => {
          if (prev <= step) {
            clearInterval(interval);
            setTimeout(() => {
              onDismiss();
            }, 0);
            return 0;
          }
          return prev - step;
        });
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [duration, isPaused, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, x: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 28, scale: 0.92, transition: { duration: 0.18, ease: 'easeOut' } }}
      transition={{ type: 'spring', stiffness: 480, damping: 32 }}
      id={`toast-${toast.id}`}
      role="alert"
      className="pointer-events-auto relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 w-full group select-none transition-all duration-200"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="p-4 flex items-start gap-3.5 bg-white">
        {/* Semantic Icon Badge */}
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105", typeConfig.badge)}>
          <Icon className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />
        </div>

        {/* Content Hierarchy */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="text-sm font-semibold text-slate-900 tracking-tight leading-none mb-1">
            {title}
          </h4>
          <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal break-words">
            {toast.message}
          </p>
        </div>

        {/* Accessible Hit-Target Close Button (≥36x36 hit box) */}
        <button
          onClick={onDismiss}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Tutup notifikasi"
          title="Tutup"
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>
      </div>

      {/* Micro-Interaction Progress Bar */}
      {duration > 0 && (
        <div className="h-[2.5px] w-full bg-slate-100 overflow-hidden">
          <div
            className={cn("h-full transition-all ease-linear", typeConfig.progressBar)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default Toast;
