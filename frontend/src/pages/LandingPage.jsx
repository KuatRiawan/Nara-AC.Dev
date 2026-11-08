import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import api from '../api';
import { useBusinessProfile, buildWhatsAppUrl } from '../hooks/useBusinessProfile';
import { CalendarCheck, Search, ArrowRight, CheckCircle2, ShieldCheck, Clock, MapPin, Phone, Mail, Wind, ChevronRight, FileText, ChevronDown, Check, X, HelpCircle, User, Camera, Printer, RotateCcw, Ticket, Wrench, AlertCircle, Award, ExternalLink, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import CompanyLogo from '../components/CompanyLogo';
import FAQAccordion from '../components/landing/FAQAccordion';
import ClientLogoMarquee from '../components/landing/ClientLogoMarquee';
import GallerySection from '../components/landing/GallerySection';
import GoogleReviewsSection from '../components/landing/GoogleReviewsSection';
import DigitalExperienceSection from '../components/landing/DigitalExperienceSection';
import MobileNav from '../components/landing/MobileNav';
import AirflowBreeze from '../components/landing/AirflowBreeze';
import EstimatorCard from '../components/landing/EstimatorCard';
import TrackerCard from '../components/landing/TrackerCard';
import HeroInteractiveCard from '../components/landing/HeroInteractiveCard';
import StickyBottomBooking from '../components/landing/StickyBottomBooking';
import ScrollToTopButton from '../components/ui/ScrollToTopButton';
import Footer from '../components/layout/Footer';

const easeOutCubic = [0.16, 1, 0.3, 1];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const fadeInUpVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutCubic },
  },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { whatsappNumber, profile } = useBusinessProfile();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [typingIndex, setTypingIndex] = useState(0);

  const { scrollY } = useScroll();
  const smoothScroll = useSpring(scrollY, { damping: 25, stiffness: 120 });
  const yHeroGlow1 = useTransform(smoothScroll, [0, 700], [0, 130]);
  const yHeroGlow2 = useTransform(smoothScroll, [0, 700], [0, -90]);
  const yHeroLeft = useTransform(smoothScroll, [0, 600], [0, 35]);
  const yHeroRight = useTransform(smoothScroll, [0, 600], [0, -20]);

  const rotatingWords = useMemo(() => [
    'Lebih Terencana.',
    'Lebih Transparan.',
    'Lebih Profesional.',
    'Lebih Nyaman.'
  ], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTypingIndex(prev => (prev + 1) % rotatingWords.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [rotatingWords]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = useCallback((id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const [liveServices, setLiveServices] = useState([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState('cuci'); // 'cuci' | 'pasang_bongkar' | 'diagnosa'

  useEffect(() => {
    let active = true;
    api.get('/services')
      .then(res => {
        if (!active) return;
        const raw = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(raw) && raw.length > 0) {
          setLiveServices(raw);
        }
      })
      .catch(() => {
      });
    return () => { active = false; };
  }, []);

  const catalogPackages = useMemo(() => {
    const list = Array.isArray(liveServices) ? liveServices : [];

    // Cuci services
    const std = list.find(s => s.kode === 'SRV-CUCI-01' || (s.nama_layanan || '').toLowerCase().includes('standard') || s.id === 1);
    const foam = list.find(s => s.kode === 'SRV-CUCI-051-RMH-FOAM' || (s.nama_layanan || '').toLowerCase().includes('foam') || s.id === 44);
    const semioh = list.find(s => s.kode === 'SRV-CUCI-CORE' || ((s.nama_layanan || '').toLowerCase().includes('semi') && (s.nama_layanan || '').toLowerCase().includes('overhaul')) || s.id === 4);
    const overhaul = list.find(s => s.kode === 'SRV-CUCI-FREON' || ((s.nama_layanan || '').toLowerCase().includes('overhaul') && !(s.nama_layanan || '').toLowerCase().includes('semi')) || s.id === 5);

    // Pasang & Bongkar
    const pasang = list.find(s => s.kode === 'SRV-INST-051-RMH-PASANG' || (s.nama_layanan || '').toLowerCase().includes('pasang') || s.id === 62);
    const bongkar = list.find(s => s.kode === 'SRV-BONGKAR-01' || (s.nama_layanan || '').toLowerCase().includes('bongkar') || s.id === 2);

    // Diagnosa & Freon
    const cekRingan = list.find(s => s.kode === 'SRV-LAIN-CEK-RINGAN' || s.id === 109);
    const cekBerat = list.find(s => s.kode === 'SRV-LAIN-CEK-BERAT' || s.id === 110);
    const freon10 = list.find(s => s.kode === 'SRV-FREON-051-R32-10PSI' || s.id === 57);

    return {
      cuci: [
        {
          id: std?.id || 1,
          tier: 'biasa',
          kategori: 'cuci',
          nama_layanan: 'Cuci AC Standard',
          subtitle: 'PERAWATAN RUTIN',
          badge: 'Rutin 2–3 Bulan',
          isPopular: false,
          deskripsi: 'Pembersihan filter dan kisi evaporator untuk unit yang masih dingin normal dan rutin diservis berkala.',
          harga: std?.harga !== undefined ? Number(std.harga) : 75000,
          durasi_menit: std?.durasi_menit !== undefined ? Number(std.durasi_menit) : 60,
          garansi: 'Garansi 14 Hari',
          highlights: [
            'Cuci cover casing & filter',
            'Cuci kisi permukaan evaporator',
            'Semprot kondensor unit outdoor',
            'Cek tekanan freon & arus listrik',
          ],
          ctaText: 'Pilih Standard',
          bookingUrl: `/booking?kategori=cuci&tier=biasa&layanan=${std?.id || 1}`,
        },
        {
          id: foam?.id || 44,
          tier: 'foam',
          kategori: 'cuci',
          nama_layanan: 'Cuci Foam / Sabun',
          subtitle: 'KERAK & JAMUR BANDEL',
          badge: 'Chemical Foam',
          isPopular: false,
          deskripsi: 'Pencucian intensif menggunakan chemical foam agent perontok kerak minyak, jamur & lendir evaporator.',
          harga: foam?.harga !== undefined ? Number(foam.harga) : 115000,
          durasi_menit: foam?.durasi_menit !== undefined ? Number(foam.durasi_menit) : 75,
          garansi: 'Garansi 14 Hari',
          highlights: [
            'SEMUA cakupan Cuci Standard',
            'Chemical foaming agent anti-kerak',
            'Rontokkan lendir & jamur bandel',
            'Sterilisasi evaporator higienis',
          ],
          ctaText: 'Pilih Cuci Foam',
          bookingUrl: `/booking?kategori=cuci&tier=foam&layanan=${foam?.id || 44}`,
        },
        {
          id: semioh?.id || 4,
          tier: 'semioh',
          kategori: 'cuci',
          nama_layanan: 'Cuci Semi Overhaul',
          subtitle: 'TUNTAS BOCOR AIR',
          badge: 'PALING DIMINATI',
          isPopular: true,
          deskripsi: 'Bongkar talang air & rotor fan blower. Solusi mutlak untuk AC bocor air, bau apek, dan hembusan angin lemah.',
          harga: semioh?.harga !== undefined ? Number(semioh.harga) : 200000,
          durasi_menit: semioh?.durasi_menit !== undefined ? Number(semioh.durasi_menit) : 90,
          garansi: 'Garansi Nyata 30 Hari',
          highlights: [
            'SEMUA cakupan Cuci Foam',
            'Bongkar total rotor fan & talang air',
            'Vakum sedot pipa pembuangan lendir',
            'Tuntas tetesan air & bau apek tuntas',
            'Cek kompresor & kalibrasi suhu',
          ],
          ctaText: 'Pilih Semi Overhaul',
          bookingUrl: `/booking?kategori=cuci&tier=semioh&layanan=${semioh?.id || 4}`,
        },
        {
          id: overhaul?.id || 5,
          tier: 'overhaul',
          kategori: 'cuci',
          nama_layanan: 'Cuci Overhaul Total',
          subtitle: 'DEEP CLEAN MAKSIMAL',
          badge: 'Restorasi Total',
          isPopular: false,
          deskripsi: 'Bongkar total seluruh unit indoor dan perendaman chemical wash evaporator untuk performa dingin maksimal seperti baru.',
          harga: overhaul?.harga !== undefined ? Number(overhaul.harga) : 350000,
          durasi_menit: overhaul?.durasi_menit !== undefined ? Number(overhaul.durasi_menit) : 120,
          garansi: 'Garansi Dingin 45 Hari',
          highlights: [
            'Bongkar total seluruh unit indoor turun ke bawah',
            'Perendaman chemical soak evaporator tuntas',
            'Pembersihan menyeluruh tanpa sisa kerak',
            'Hembusan angin maksimal layaknya AC baru',
          ],
          ctaText: 'Pilih Overhaul Total',
          bookingUrl: `/booking?kategori=cuci&tier=overhaul&layanan=${overhaul?.id || 5}`,
        },
      ],
      pasang_bongkar: [
        {
          id: pasang?.id || 62,
          tier: 'pasang',
          kategori: 'pasang_bongkar',
          nama_layanan: 'Pasang Unit AC',
          subtitle: 'INSTALASI BARU / PINDAHAN',
          badge: 'Vakum Standar Pabrik',
          isPopular: true,
          deskripsi: 'Pemasangan unit indoor & outdoor waterpass rapi, proses vakum pipa standar pabrikan & uji performa pendinginan.',
          harga: pasang?.harga !== undefined ? Number(pasang.harga) : 300000,
          durasi_menit: pasang?.durasi_menit !== undefined ? Number(pasang.durasi_menit) : 120,
          garansi: 'Garansi Instalasi 30 Hari',
          highlights: [
            'Bracket indoor & outdoor waterpass presisi',
            'Vakum pipa standar instalasi pabrikan',
            'Uji kebocoran sambungan neppel & flaring',
            'Testing ampere & kestabilan pendinginan',
          ],
          ctaText: 'Pesan Pasang AC',
          bookingUrl: `/booking?kategori=pasang_bongkar&tier=pasang&layanan=${pasang?.id || 62}`,
        },
        {
          id: bongkar?.id || 2,
          tier: 'bongkar',
          kategori: 'pasang_bongkar',
          nama_layanan: 'Bongkar Unit AC',
          subtitle: 'PELEPASAN UNIT AMAN',
          badge: 'Pump Down System',
          isPopular: false,
          deskripsi: 'Pelepasan unit dengan pump-down penguncian freon aman di kompresor tanpa risiko terbuang sia-sia.',
          harga: bongkar?.harga !== undefined ? Number(bongkar.harga) : 150000,
          durasi_menit: bongkar?.durasi_menit !== undefined ? Number(bongkar.durasi_menit) : 60,
          garansi: 'Garansi Bebas Bocor Freon',
          highlights: [
            'Penguncian freon aman di kompresor (Pump-Down)',
            'Freon aman tanpa terbuang ke udara',
            'Pelepasan rapi pipa, bracket, dan kelistrikan',
            'Unit dirapikan siap untuk dipindahkan',
          ],
          ctaText: 'Pesan Bongkar AC',
          bookingUrl: `/booking?kategori=pasang_bongkar&tier=bongkar&layanan=${bongkar?.id || 2}`,
        },
      ],
      diagnosa: [
        {
          id: cekRingan?.id || 109,
          tier: 'diagnosa_ringan',
          kategori: 'diagnosa',
          nama_layanan: 'Pengecekan AC Ringan',
          subtitle: 'DIAGNOSA KENDALA AWAL',
          badge: 'Cek Cepat',
          isPopular: false,
          deskripsi: 'Pengecekan fungsi remote, arus listrik (Ampere), hembusan angin, dan diagnosa awal kendala AC.',
          harga: cekRingan?.harga !== undefined ? Number(cekRingan.harga) : 50000,
          durasi_menit: cekRingan?.durasi_menit !== undefined ? Number(cekRingan.durasi_menit) : 45,
          garansi: 'Bebas Biaya jika Lanjut Servis',
          highlights: [
            'Cek arus listrik kompresor (Ampere)',
            'Pengukuran tekanan freon manifold gauge',
            'Cek sensor suhu & hembusan dingin',
            'Bebas biaya pengecekan jika lanjut perbaikan',
          ],
          ctaText: 'Pesan Pengecekan',
          bookingUrl: `/booking?kategori=diagnosa&tier=diagnosa_ringan&layanan=${cekRingan?.id || 109}`,
        },
        {
          id: cekBerat?.id || 110,
          tier: 'diagnosa_berat',
          kategori: 'diagnosa',
          nama_layanan: 'Pengecekan Kerusakan Berat',
          subtitle: 'ANALISA KOMPONEN & KELISTRIKAN',
          badge: 'Diagnosa Mendalam',
          isPopular: true,
          deskripsi: 'Analisa mendalam kompresor mati, korsleting modul PCB inverter, atau kebocoran freon tersembunyi.',
          harga: cekBerat?.harga !== undefined ? Number(cekBerat.harga) : 100000,
          durasi_menit: cekBerat?.durasi_menit !== undefined ? Number(cekBerat.durasi_menit) : 60,
          garansi: 'Diagnosa Akurat Bergaransi',
          highlights: [
            'Analisa mendalam kompresor mati atau bising',
            'Cek modul PCB inverter & sensor kelistrikan',
            'Deteksi kebocoran freon pipa tanam / evaporator',
            'Estimasi rincian biaya transparan sebelum dikerjakan',
          ],
          ctaText: 'Pesan Pengecekan Berat',
          bookingUrl: `/booking?kategori=diagnosa&tier=diagnosa_berat&layanan=${cekBerat?.id || 110}`,
        },
        {
          id: freon10?.id || 57,
          tier: 'biasa',
          kategori: 'cuci',
          nama_layanan: 'Tambah Freon (Mulai 10 PSI)',
          subtitle: 'FREON RESMI ORIGINAL',
          badge: 'Freon Murni 100%',
          isPopular: false,
          deskripsi: 'Pengisian freon murni presisi sesuai standar pabrikan untuk mengembalikan suhu sejuk menggigil.',
          harga: freon10?.harga !== undefined ? Number(freon10.harga) : 45000,
          durasi_menit: 30,
          garansi: 'Garansi Dingin',
          highlights: [
            'Freon murni 100% tanpa oplosan',
            'Tersedia tipe R32, R410A, dan R22',
            'Pengecekan titik flare sambungan pipa',
            'Tekanan terukur presisi manifold gauge',
          ],
          ctaText: 'Pesan Servis + Freon',
          bookingUrl: `/booking?kategori=cuci&tier=biasa`,
        },
      ],
    };
  }, [liveServices]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden text-slate-800">
      <a href="#main-content" className="sr-only focus:not-sr-only absolute top-0 left-0 z-50 p-4 bg-blue-600 text-white font-bold rounded-br-xl text-sm hover:bg-blue-700 transition-colors">
        Lewati ke Konten Utama
      </a>

      <header
        className={`fixed w-full top-0 z-40 transition-all duration-300 ${isScrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-xs border-b border-sky-100 py-3.5'
          : 'bg-white/90 backdrop-blur-md border-b border-sky-100/60 py-4.5'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">

          <Link to="/" className="flex items-center shrink-0 mr-4 xl:mr-8 group transition-transform hover:opacity-90">
            <CompanyLogo dark={false} iconSize="h-8 sm:h-9" />
          </Link>

          <nav className="hidden lg:flex items-center gap-4 xl:gap-7 text-xs xl:text-sm font-bold text-slate-700">
            {[
              { id: 'layanan', label: 'Layanan' },
              { id: 'keunggulan', label: 'Keunggulan' },
              { id: 'cara-kerja', label: 'Cara Kerja' },
              { id: 'galeri', label: 'Dokumentasi' },
              { id: 'ulasan', label: 'Ulasan' },
              { id: 'faq', label: 'FAQ' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`relative py-1 transition-colors hover:text-blue-600 cursor-pointer whitespace-nowrap shrink-0 ${activeSection === item.id ? 'text-blue-600' : 'text-slate-600'
                  }`}
              >
                {item.label}
                {activeSection === item.id && (
                  <motion.span
                    layoutId="navbar-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <Link to="/status">
              <Button
                variant="outline"
                size="sm"
                className="border-sky-200 text-slate-700 hover:text-blue-600 hover:bg-sky-50 font-bold rounded-xl px-2.5 sm:px-3.5 h-9 sm:h-9.5 text-xs cursor-pointer shadow-2xs flex items-center gap-1 sm:gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="hidden xs:inline sm:inline">Cek Status</span>
                <span className="inline xs:hidden sm:hidden">Lacak</span>
              </Button>
            </Link>

            <Link to="/login" className="hidden sm:inline-flex">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-3.5 sm:px-4.5 h-9.5 text-xs shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Masuk Member</span>
              </Button>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-sky-50 transition-colors cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <div className="flex flex-col gap-1.5 w-5">
                <span className="w-full h-0.5 bg-slate-800 rounded-full"></span>
                <span className="w-3/4 h-0.5 bg-slate-800 rounded-full"></span>
                <span className="w-full h-0.5 bg-slate-800 rounded-full"></span>
              </div>
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        scrollTo={scrollTo}
      />

      <main id="main-content">
        <section
          id="home"
          className="relative pt-24 pb-14 sm:pt-36 sm:pb-24 lg:pt-40 lg:pb-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sky-50/90 via-blue-50/40 to-white text-slate-900 overflow-hidden min-h-[85vh] sm:min-h-[92vh] flex items-center"
        >
          <motion.div
            style={{ y: yHeroGlow1 }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-sky-200/40 rounded-full blur-[140px] pointer-events-none"
          />
          <motion.div
            style={{ y: yHeroGlow2 }}
            className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/35 rounded-full blur-[120px] pointer-events-none"
          />

          <AirflowBreeze />

          <div className="max-w-7xl mx-auto w-full relative z-10 grid lg:grid-cols-12 gap-8 lg:gap-16 items-center">

            <motion.div
              style={{ y: yHeroLeft }}
              className="lg:col-span-7 space-y-5 sm:space-y-7 text-center lg:text-left"
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: easeOutCubic }}
                className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-slate-900"
              >
                Udara Nyaman,<br />
                Perawatan AC<br />
                <span className="inline-block relative overflow-hidden pb-1 pt-0.5">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={rotatingWords[typingIndex]}
                      initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -30, filter: 'blur(6px)' }}
                      transition={{ duration: 0.5, ease: easeOutCubic }}
                      className="inline-block bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 bg-clip-text text-transparent"
                    >
                      {rotatingWords[typingIndex]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: easeOutCubic }}
                className="text-slate-600 text-sm sm:text-lg lg:text-xl font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0"
              >
                Jadwalkan servis AC dengan lebih mudah, pantau proses pengerjaan secara transparan, dan kelola perawatan AC Anda bersama teknisi terverifikasi NARA AC.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: easeOutCubic }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start pt-1"
              >
                <Link to="/booking" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl px-8 h-12 sm:h-14 text-sm sm:text-base shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/35 transition-all cursor-pointer group flex items-center justify-center"
                  >
                    <CalendarCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform" />
                    Booking Service Sekarang
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => scrollTo('layanan')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 h-12 sm:h-14 rounded-2xl bg-white hover:bg-sky-50 text-slate-800 font-bold text-sm sm:text-base border border-sky-200 shadow-xs transition-all cursor-pointer group"
                >
                  <span>Jelajahi Paket & Harga</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-blue-600" />
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.6 }}
                className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-slate-600 font-medium"
              >
                <button
                  type="button"
                  onClick={() => scrollTo('ulasan')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-sky-200 shadow-2xs hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Ulasan Pelanggan</span>
                  <span className="text-slate-600 font-medium">(Google Maps)</span>
                </button>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Garansi Pengerjaan Nyata</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>SOP 7 Langkah Pengerjaan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>Slot Waktu Terorganisir</span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              style={{ y: yHeroRight }}
              className="lg:col-span-5 relative"
            >
              <HeroInteractiveCard services={liveServices} />
            </motion.div>
          </div>
        </section>

        <ClientLogoMarquee />

        <section id="layanan" className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center max-w-3xl mx-auto mb-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                Pilih Paket Layanan AC
              </h2>
            </div>

            {/* Kategori Tab Filter Responsive */}
            <div className="flex justify-center mb-10 sm:mb-12">
              <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 p-1.5 bg-sky-50/80 rounded-2xl border border-sky-100 gap-1.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveCatalogTab('cuci')}
                  className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeCatalogTab === 'cuci'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Wind className="w-4 h-4 shrink-0" />
                  <span className="truncate">Paket Cuci AC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCatalogTab('pasang_bongkar')}
                  className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeCatalogTab === 'pasang_bongkar'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Wrench className="w-4 h-4 shrink-0" />
                  <span className="truncate">Pasang & Bongkar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCatalogTab('diagnosa')}
                  className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeCatalogTab === 'diagnosa'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">Perbaikan & Freon</span>
                </button>
              </div>
            </div>

            <motion.div
              key={activeCatalogTab}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className={`grid gap-6 items-stretch mb-12 ${
                activeCatalogTab === 'cuci'
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                  : activeCatalogTab === 'pasang_bongkar'
                  ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
                  : 'grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto'
              }`}
            >
              {(catalogPackages[activeCatalogTab] || []).map((pkg) => {
                const isCore = pkg.isPopular;

                return (
                  <motion.div
                    key={pkg.id || pkg.nama_layanan}
                    variants={fadeInUpVariant}
                    whileHover={{ y: -4, transition: { duration: 0.2, ease: easeOutCubic } }}
                    className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative group ${isCore
                      ? 'bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-500 shadow-xl shadow-blue-500/10 lg:-translate-y-2'
                      : 'bg-white border-2 border-sky-100 hover:border-sky-300 shadow-md hover:shadow-xl shadow-sky-900/5'
                      }`}
                  >
                    {isCore && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-full shadow-md whitespace-nowrap">
                        {pkg.badge || 'PALING DIREKOMENDASIKAN'}
                      </div>
                    )}

                    <div>
                      <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {pkg.nama_layanan}
                      </h3>

                      <p className="text-slate-600 text-xs leading-relaxed mb-6 min-h-[44px]">
                        {pkg.deskripsi}
                      </p>

                      <div className="mb-6 pb-6 border-b border-sky-100">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900">
                            Rp {pkg.harga.toLocaleString('id-ID')}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">/ unit</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs font-bold ${isCore ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {pkg.garansi}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            ± {pkg.durasi_menit}m
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5 mb-6">
                        {(pkg.highlights || []).map((task, tIdx) => (
                          <div key={`hl-${tIdx}`} className="flex items-center gap-2 text-xs text-slate-700">
                            <Check className={`w-3.5 h-3.5 shrink-0 stroke-[2.5] ${isCore ? 'text-blue-600' : 'text-slate-700'}`} />
                            <span className={isCore && (tIdx === 0 || tIdx === 1) ? 'font-bold text-slate-900' : ''}>
                              {task}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link to={pkg.bookingUrl} className="block w-full pt-4">
                      <Button
                        className={`w-full h-11 rounded-full font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${isCore
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                      >
                        <span>{pkg.ctaText}</span>
                      </Button>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="p-6 sm:p-8 rounded-3xl bg-sky-50/70 border border-sky-200/80 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
              <div>
                <h4 className="font-black text-slate-900 text-base sm:text-lg">Butuh Servis AC dalam Jumlah Banyak untuk Kantor / Ruko?</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                  Kontrak pemeliharaan berkala untuk gedung, instansi, dan perumahan dengan invoice resmi CV. Nara Teknindotama.
                </p>
              </div>
              <a
                href={buildWhatsAppUrl(whatsappNumber, 'Halo NARA AC, saya ingin konsultasi servis AC kantor/ruko')}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-sky-200 text-slate-900 hover:text-blue-600 font-bold text-xs sm:text-sm shrink-0 shadow-xs hover:shadow-md transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-500" />
                <span>Konsultasi WhatsApp</span>
                <span className="sr-only"> (buka di tab baru)</span>
              </a>
            </div>
          </div>
        </section>

        <section id="keunggulan" className="py-24 bg-gradient-to-b from-white via-sky-50/40 to-white text-slate-900 relative overflow-hidden border-t border-sky-100/60">

          <div className="absolute top-1/2 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-200/30 rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                Mengapa Memilih NARA AC?
              </h2>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >

              <motion.div
                variants={fadeInUpVariant}
                className="lg:col-span-2 bg-slate-900 text-white rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden"
              >
                <div className="relative z-10">
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
                    7 Langkah SOP Standar Baku &amp; Garansi Pekerjaan Nyata s.d. 45 Hari
                  </h3>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                    Setiap kunjungan teknisi mengikuti urutan pemeriksaan baku: pembersihan filter, pencucian evaporator bertekanan, pencucian kondensor outdoor, vakum jalur drainase, hingga uji suhu hembusan dan tekanan manifold sebelum serah terima.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3.5 mt-6 pt-6 border-t border-slate-800">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white">Pemeriksaan Ulang Tanpa Biaya</p>
                        <p className="text-xs text-slate-300 mt-0.5">Kunjungan garansi gratis bila unit kembali meneteskan air atau kurang dingin.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Award className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white">Dokumentasi Parameter Teknis</p>
                        <p className="text-xs text-slate-300 mt-0.5">Foto sebelum/sesudah pengerjaan beserta catatan tekanan PSI dan arus Ampere.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={fadeInUpVariant}
                className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mb-5">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Jadwal Pasti &amp; Terjadwal</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Pilih tanggal dan rentang jam kedatangan teknisi langsung saat pemesanan tanpa menunggu konfirmasi manual.
                </p>
              </motion.div>

              <motion.div
                variants={fadeInUpVariant}
                className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center mb-5">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Pelacakan Status Digital</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Pantau tahapan pengerjaan melalui kode tiket resmi mulai dari penugasan teknisi hingga penerbitan e-Invoice.
                </p>
              </motion.div>

              <motion.div
                variants={fadeInUpVariant}
                className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Transparansi Biaya Katalog</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Seluruh tarif jasa cuci, bongkar-pasang, dan pengisian refrigeran mengacu pada daftar harga resmi CV. Nara Teknindotama.
                </p>
              </motion.div>

              <motion.div
                variants={fadeInUpVariant}
                className="bg-white rounded-3xl p-7 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center mb-5">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Rekam Jejak &amp; Riwayat Unit</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Data kapasitas PK, merek, serta riwayat perawatan setiap unit tersimpan terstruktur untuk jadwal pemeliharaan berkala.
                </p>
              </motion.div>

            </motion.div>
          </div>
        </section>

        <section id="cara-kerja" className="py-24 bg-white relative border-t border-sky-100/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                4 Langkah Booking Servis AC
              </h2>
            </div>

            <div className="relative">

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10"
              >
                {[
                  {
                    step: '01',
                    title: 'Pilih Layanan & Waktu',
                    desc: 'Pilih paket AC (Standar / Core / Core + Freon), lalu tentukan tanggal dan jam pengerjaan yang sesuai.',
                  },
                  {
                    step: '02',
                    title: 'Sistem Terbitkan Kode',
                    desc: 'Booking Anda otomatis tercatat di sistem, menerbitkan kode unik (BK-XXX), dan diteruskan ke admin teknisi.'
                  },
                  {
                    step: '03',
                    title: 'Pengerjaan SOP Ketat',
                    desc: 'Teknisi tiba sesuai jadwal dengan seragam resmi, membawa mesin steam bertekanan, dan memproteksi area kerja.'
                  },
                  {
                    step: '04',
                    title: 'Verifikasi & Selesai',
                    desc: 'Uji running test suhu dingin, cek kelancaran drainase, dan riwayat servis tersimpan aman di sistem.'
                  }
                ].map((st) => (
                  <motion.div
                    key={st.step}
                    variants={fadeInUpVariant}
                    whileHover={{ y: -4, transition: { duration: 0.2, ease: easeOutCubic } }}
                    className="relative group"
                  >
                    <div className="bg-sky-50/60 border border-sky-100 rounded-3xl p-6 sm:p-7 h-full flex flex-col justify-between hover:bg-white hover:border-blue-300 hover:shadow-xl shadow-blue-900/5 transition-all duration-300">
                      <div>
                        <div className="mb-5">
                          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-sky-200 flex items-center justify-center shadow-sm group-hover:border-blue-500 group-hover:bg-blue-600 transition-colors">
                            <span className="font-mono text-lg font-black text-blue-600 group-hover:text-white transition-colors">
                              {st.step}
                            </span>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{st.title}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{st.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

          </div>
        </section>

        <GallerySection />

        <GoogleReviewsSection />

        <DigitalExperienceSection />

        <section id="profil" className="py-24 bg-white relative border-t border-sky-100/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

              <div className="lg:col-span-6 space-y-6">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                  CV. Nara Teknindotama
                </h2>
                <p className="text-slate-600 text-base leading-relaxed">
                  CV. Nara Teknindotama adalah entitas usaha berbadan hukum yang berdedikasi pada penyediaan jasa teknis pendingin udara (AC), suku cadang resmi, serta pemeliharaan unit skala residensial maupun komersial.
                </p>
                <p className="text-slate-600 text-base leading-relaxed">
                  Aktivitas operasional perawatan AC telah dirintis sejak <strong>Februari 2022</strong> dan resmi berbadan hukum pada <strong>Mei 2025</strong> guna memberikan perlindungan, kepastian hukum, dan standar pelayanan profesional bagi seluruh pelanggan.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100">
                    <p className="text-xs text-slate-500 font-bold uppercase">Operasional Dimulai</p>
                    <p className="text-lg font-black text-slate-900 mt-1">Februari 2022</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100">
                    <p className="text-xs text-slate-500 font-bold uppercase">Legalitas Resmi</p>
                    <p className="text-lg font-black text-slate-900 mt-1">Mei 2025</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-gradient-to-br from-sky-50 via-blue-50/70 to-sky-100/60 text-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl shadow-blue-500/5 border border-sky-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/40 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Cakupan Wilayah Operasional</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs sm:text-sm">
                    {[
                      'Ciangsana & Gunung Putri',
                      'Kota Wisata & Cibubur',
                      'Cikeas & Bojong Kulur',
                      'Kab. Bogor & Sekitarnya',
                      'Kota Depok Bagian Timur',
                      'Jakarta Timur & Sekitarnya'
                    ].map((area, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/90 border border-sky-100 text-slate-700 shadow-2xs">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{area}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-sky-200/60 text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-900">Alamat Kantor & Workshop:</strong><br />
                    Jl. Teluk Langsa RT.002 RW.016, Ciangsana, Kec. Gunung Putri, Kabupaten Bogor, Jawa Barat.
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <section id="faq" className="py-24 bg-sky-50/30 border-t border-sky-100/60 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="space-y-4">
              <FAQAccordion
                index={0}
                question="Berapa lama durasi pengerjaan cuci AC standar dan Core?"
                answer="Cuci AC Standar membutuhkan waktu sekitar 45 hingga 60 menit per unit. Sedangkan Paket Core (Deep Clean) membutuhkan 75 hingga 90 menit karena teknisi membongkar total kipas blower dan talang air untuk membersihkan lumut dan lendir penyumbat secara tuntas."
              />
              <FAQAccordion
                index={1}
                question="Apa perbedaan utama Paket Standar dan Paket Core?"
                answer="Paket Standar cocok untuk perawatan rutin AC yang masih dingin dan hanya berdebu ringan (dibersihkan dari luar). Sedangkan Paket Core adalah overhaul deep-clean: casing, talang air, dan rotor blower dilepas total, dicuci dengan cairan anti-bakteri, dan pipa pembuangan divakum. Core sangat direkomendasikan jika AC Anda pernah meneteskan air (bocor) atau berbau apek."
              />
              <FAQAccordion
                index={2}
                question="Bagaimana cara mengecek status tiket booking saya?"
                answer="Anda dapat membuka menu 'Cek Status' di website ini, lalu masukkan kode booking Anda (misal BK-2026-001) atau nomor HP yang didaftarkan. Anda dapat melihat apakah tiket sedang dijadwalkan, dikerjakan oleh teknisi, atau sudah selesai."
              />
              <FAQAccordion
                index={3}
                question="Apakah ada garansi setelah pengerjaan servis AC?"
                answer="Ya, kami memberikan garansi pekerjaan nyata: 14 hari untuk Paket Standar, 30 hari penuh untuk Paket Core, dan 45 hari untuk Paket Core + Freon. Jika AC mengalami kendala seperti bocor air atau kurang dingin pasca pengerjaan, teknisi kami akan datang memeriksa kembali gratis."
              />
              <FAQAccordion
                index={4}
                question="Apakah NARA AC melayani pengerjaan untuk kantor, ruko, atau instansi?"
                answer="Tentu. Selain rumah tinggal, CV. Nara Teknindotama melayani kantor, ruko, restoran, klinik, dan instansi dengan opsi pembuatan invoice resmi berbadan hukum dan penawaran kerja sama pemeliharaan rutin berkala (MoU/SLA)."
              />
              <FAQAccordion
                index={5}
                question="Bagaimana jika saya perlu mengubah jadwal pengerjaan (reschedule)?"
                answer="Anda dapat menghubungi admin layanan pelanggan NARA AC melalui nomor WhatsApp resmi kami setidaknya 24 jam sebelum jadwal pengerjaan agar kami dapat menyesuaikan kembali slot teknisi lapangan."
              />
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-sky-100/60">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOutCubic }}
              viewport={{ once: true }}
              className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-sky-500 p-8 sm:p-14 lg:p-16 text-white text-center relative overflow-hidden shadow-2xl shadow-blue-500/20"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[90px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-300/20 rounded-full blur-[90px] pointer-events-none" />

              <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
                  Jadwalkan Perawatan AC Anda Sekarang
                </h2>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                  <Link to="/booking">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white hover:bg-sky-50 text-blue-700 font-black rounded-2xl px-8 h-14 text-base shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 group"
                    >
                      <CalendarCheck className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span>Booking Service Sekarang</span>
                    </Button>
                  </Link>

                  <Link to="/status">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-white/15 hover:bg-white/25 text-white border-white/30 rounded-2xl px-8 h-14 text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Search className="w-4 h-4 text-white" />
                      <span>Cek Status Booking</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-sky-50/60 text-slate-600 pt-12 pb-8 sm:pt-16 sm:pb-10 px-4 sm:px-6 lg:px-8 border-t border-sky-100">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">

            <div className="lg:col-span-4 space-y-4">
              <Link to="/" className="inline-block">
                <CompanyLogo dark={false} iconSize="h-10" />
              </Link>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-sm">
                Sistem Pengelolaan Jadwal & Perawatan AC Terpercaya oleh <strong>CV. Nara Teknindotama</strong>. Melayani cuci AC, perbaikan, isi freon, dan instalasi di area Jabodetabek.
              </p>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 tracking-wider uppercase">Menu Utama</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                <li>
                  <button onClick={() => scrollTo('home')} className="hover:text-blue-600 transition-colors cursor-pointer">
                    Beranda
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('layanan')} className="hover:text-blue-600 transition-colors cursor-pointer">
                    Katalog Layanan
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('keunggulan')} className="hover:text-blue-600 transition-colors cursor-pointer">
                    Keunggulan
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('cara-kerja')} className="hover:text-blue-600 transition-colors cursor-pointer">
                    Cara Kerja
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('galeri')} className="hover:text-blue-600 transition-colors cursor-pointer">
                    Dokumentasi
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('ulasan')} className="hover:text-blue-600 transition-colors cursor-pointer">
                    Ulasan Google
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('faq')} className="hover:text-blue-600 transition-colors cursor-pointer">
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 tracking-wider uppercase">Informasi Usaha</h4>
              <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <li>
                  <strong className="text-slate-900">Badan Usaha Resmi:</strong><br />
                  CV. Nara Teknindotama (Akta No. 07 – 09 Mei 2025)<br />
                  <span className="text-[11px] text-slate-500">NIB: 2805250066735 &bull; NPWP: 10.000.000.0-258.288<br />AHU-0045403-AH.01.14 Tahun 2025</span>
                </li>
                <li>
                  <strong className="text-slate-900">Workshop & Kantor:</strong><br />
                  Jl. Teluk Langsa RT.002 RW.016, Ciangsana, Kec. Gunung Putri, Kab. Bogor
                </li>
                <li>
                  <strong className="text-slate-900">Cakupan Wilayah:</strong><br />
                  Ciangsana, Kota Wisata, Cibubur, Cikeas, Depok, dan Jakarta Timur
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 tracking-wider uppercase">Kontak Resmi</h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <a href={buildWhatsAppUrl(whatsappNumber)} target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">
                    {profile?.phone || 'WhatsApp'} (WhatsApp)
                    <span className="sr-only"> (buka di tab baru)</span>
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <a href="mailto:narateknindotama@gmail.com" className="hover:text-blue-600 transition-colors">
                    narateknindotama@gmail.com
                  </a>
                </li>
                <li className="pt-2 text-xs text-slate-500">
                  <span>Instagram: @narateknindotamaserviceac</span><br />
                  <span>TikTok: Nara Theknik</span>
                </li>
                <li className="pt-2 flex flex-col gap-1.5">
                  <Link to="/login" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold text-xs">
                    <span>Portal Pelanggan &amp; Member</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link to="/staff/login" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-medium text-xs">
                    <span>Portal Staf &amp; Teknisi</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </li>
              </ul>
            </div>

          </div>
        </section>

        <Footer variant="landing" />

        <StickyBottomBooking />

        <ScrollToTopButton />
      </main>

    </div>
  );
}
