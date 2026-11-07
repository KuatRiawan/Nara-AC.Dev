import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Eye, X, CheckCircle2, Camera, ChevronLeft, ChevronRight } from 'lucide-react';

const easeOutCubic = [0.22, 1, 0.36, 1];

export default function GallerySection() {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(null);
  const closeButtonRef = useRef(null);
  const triggerRefs = useRef({});
  const savedScrollY = useRef(0);

  const galleryItems = useMemo(() => [
    {
      id: 1,
      src: '/images/gallery/1.jpg',
      title: 'Pembersihan Evaporator & SOP Proteksi Dinding',
      tag: 'Cuci Evaporator',
      desc: 'Pemasangan plastik pelindung dinding dan penyemprotan evaporator indoor bertekanan presisi tanpa mengotori ruangan pelanggan.'
    },
    {
      id: 2,
      src: '/images/gallery/2.jpg',
      title: 'Pencucian Filter Udara Bebas Debu & Jamur',
      tag: 'Filter Udara',
      desc: 'Pembersihan mendalam kisi filter indoor menggunakan nozzle khusus hingga steril dari partikel debu halus dan alergen.'
    },
    {
      id: 3,
      src: '/images/gallery/3.jpg',
      title: 'Diagnosa Digital & Tekanan Manifold Freon R32',
      tag: 'Uji Refrigeran',
      desc: 'Pemeriksaan akurasi tekanan freon dan arus kompresor dengan manifold gauge serta tang ampere digital berstandar Daikin.'
    },
    {
      id: 4,
      src: '/images/gallery/4.jpg',
      title: 'Pencucian Menyeluruh Casing & Cover Indoor',
      tag: 'Detailing Cover',
      desc: 'Pembersihan kisi-kisi udara, talang air kondensasi, dan cover bodi luar hingga bersih tuntas sebelum dipasang kembali.'
    },
    {
      id: 5,
      src: '/images/gallery/5.jpg',
      title: 'Perawatan & Servis Kompresor Outdoor Lapangan',
      tag: 'Unit Outdoor',
      desc: 'Pemeriksaan mekanikal dan elektrikal unit kondensor luar dengan perlengkapan APD keselamatan kerja lengkap.'
    },
    {
      id: 6,
      src: '/images/gallery/6.jpg',
      title: 'Perakitan Kembali Cover & Verifikasi Swing Udara',
      tag: 'Finishing Unit',
      desc: 'Pemasangan presisi bodi indoor, pengetesan motor swing flap, dan running test hembusan udara sejuk pasca-pengerjaan.'
    }
  ], []);

  const activePhoto = activeIndex !== null ? galleryItems[activeIndex] || null : null;

  const handleOpenPhoto = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  const handleClosePhoto = useCallback(() => {
    setActiveIndex((prevIdx) => {
      const closedItem = prevIdx !== null ? galleryItems[prevIdx] : null;
      if (closedItem && triggerRefs.current[closedItem.id]) {
        requestAnimationFrame(() => {
          triggerRefs.current[closedItem.id]?.focus({ preventScroll: true });
        });
      }
      return null;
    });
  }, [galleryItems]);

  const handlePrevPhoto = useCallback((e) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + galleryItems.length) % galleryItems.length;
    });
  }, [galleryItems.length]);

  const handleNextPhoto = useCallback((e) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % galleryItems.length;
    });
  }, [galleryItems.length]);

  useEffect(() => {
    if (activeIndex === null) return undefined;

    savedScrollY.current = window.scrollY || window.pageYOffset || 0;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const originalStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const focusTimer = requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClosePhoto();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPhoto();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPhoto();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalStyle.overflow;
      document.body.style.position = originalStyle.position;
      document.body.style.top = originalStyle.top;
      document.body.style.left = originalStyle.left;
      document.body.style.right = originalStyle.right;
      document.body.style.width = originalStyle.width;
      document.body.style.paddingRight = originalStyle.paddingRight;
      window.scrollTo(0, savedScrollY.current);
    };
  }, [activeIndex !== null, handleClosePhoto, handlePrevPhoto, handleNextPhoto]);

  return (
    <section
      id="galeri"
      className="py-24 bg-white text-slate-900 relative overflow-hidden border-t border-slate-200/60"
    >
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-sky-200/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOutCubic }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
            Dokumentasi Pengerjaan <span className="text-blue-600">Teknisi NARA AC</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {galleryItems.map((item, index) => (
            <motion.button
              type="button"
              key={item.id}
              ref={(el) => {
                triggerRefs.current[item.id] = el;
              }}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: shouldReduceMotion ? 0 : index * 0.06, duration: 0.45, ease: easeOutCubic }}
              viewport={{ once: true, margin: '-50px' }}
              onClick={() => handleOpenPhoto(index)}
              aria-label={`Lihat dokumentasi: ${item.title}`}
              className="group relative bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-xl shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col text-left hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={item.src}
                  alt={item.title}
                  width={400}
                  height={300}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950/50 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />

                <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-sky-100 shadow-md">
                  <Camera className="w-3 h-3 text-blue-500" /> {item.tag}
                </span>

                <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md">
                  <Eye className="w-4 h-4" />
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between w-full">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activePhoto && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                onClick={handleClosePhoto}
                className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gallery-modal-title"
              >
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0.96, opacity: 0, y: 8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 8 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: easeOutCubic }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-4xl w-full max-h-[90vh] bg-white rounded-3xl overflow-hidden border border-sky-200 shadow-2xl flex flex-col my-auto relative"
                >
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-sky-100 bg-white shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 shrink-0">
                        <Camera className="w-3 h-3 text-blue-600" />
                        {activePhoto.tag}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Foto {activeIndex + 1} dari {galleryItems.length}
                      </span>
                    </div>

                    <button
                      ref={closeButtonRef}
                      type="button"
                      onClick={handleClosePhoto}
                      className="w-9 h-9 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
                      aria-label="Tutup pratinjau foto (Escape)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="relative bg-slate-950 flex items-center justify-center min-h-[260px] sm:min-h-[380px] max-h-[60vh] w-full overflow-hidden select-none">
                    <img
                      src={activePhoto.src}
                      alt={activePhoto.title}
                      className="max-h-[58vh] w-auto max-w-full object-contain mx-auto p-2 sm:p-4"
                    />

                    {galleryItems.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={handlePrevPhoto}
                          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white text-blue-700 transition-all flex items-center justify-center cursor-pointer shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          aria-label="Foto sebelumnya"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button
                          type="button"
                          onClick={handleNextPhoto}
                          className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white text-blue-700 transition-all flex items-center justify-center cursor-pointer shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          aria-label="Foto selanjutnya"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-5 sm:p-6 bg-white border-t border-sky-100 overflow-y-auto">
                    <h3 id="gallery-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
                      {activePhoto.title}
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      {activePhoto.desc}
                    </p>

                    <div className="mt-4 pt-3.5 border-t border-sky-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Dokumentasi Terverifikasi CV. Nara Teknindotama
                      </span>
                      <span className="text-slate-500">
                        Gunakan tombol <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono">←</kbd>{' '}
                        <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono">→</kbd> atau{' '}
                        <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono">Esc</kbd>
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </section>
  );
}