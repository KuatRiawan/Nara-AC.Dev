import React from 'react';
import { Printer, X, Download, ShieldCheck, CheckCircle2, Clock, CreditCard, Building2, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export default function OfficialRekapInvoiceSheet({
  isOpen,
  onClose,
  invoices = [],
  kpis = {},
  periodLabel = 'Bulan Ini',
  statusFilter = 'all',
}) {
  if (!isOpen) return null;

  const printDate = new Date();
  const formattedDate = printDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedDateTime = printDate.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const docNumber = `REKAP/INV/${printDate.getFullYear()}/${String(printDate.getMonth() + 1).padStart(2, '0')}/${String(Date.now()).slice(-4)}`;

  const statusLabel = 
    statusFilter === 'lunas' ? 'Hanya Faktur Lunas' :
    statusFilter === 'pending' ? 'Hanya Faktur Pending' :
    statusFilter === 'verify' ? 'Perlu Verifikasi Bukti' :
    'Semua Status';

  const handlePrint = () => {
    const origTitle = document.title;
    document.title = `Rekap_Invoice_${periodLabel.replace(/\s+/g, '_')}_CV_NARA_TEKNINDOTAMA`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1000);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 lg:p-8 print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible print:block print:w-full print:h-auto"
    >
      {/* Container Preview Sheet (Centered on Screen, Full Width on Print) */}
      <div className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:max-h-none print:h-auto print:my-0 print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        
        {/* Floating Top Bar (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0 print:hidden shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Pratinjau Cetak Rekapitulasi Faktur</h3>
              <p className="text-[11px] text-slate-300">Format A4 Resmi CV. NARA TEKNINDOTAMA • Siap Print / PDF</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / PDF)</span>
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-9 px-3 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Tutup</span>
            </Button>
          </div>
        </div>

        {/* Printable Paper Area (Scrolls nicely on screen, full printable sheet on print) */}
        <div 
          id="printable-rekap-content" 
          className="p-6 sm:p-8 text-slate-900 font-sans text-xs bg-white overflow-y-auto flex-1 print:overflow-visible print:p-0 print:m-0"
        >
          
          {/* 1. KOP SURAT RESMI */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4 print:pb-3 print:mb-4">
            <div className="flex items-start gap-3.5">
              <img
                src="/images/logo.png"
                alt="Logo CV. Nara Teknindotama"
                className="h-12 w-auto object-contain shrink-0 mt-0.5"
              />
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">
                  CV. NARA TEKNINDOTAMA
                </h1>
                <p className="text-[10px] font-bold text-blue-700 tracking-wide mt-1 uppercase">
                  Nara Air Conditioning Solutions • Servis, Pengadaan &amp; Perawatan AC
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                  Jl. Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  WA / CS: 0813-8529-3137 • NIB: 2805250066735 • NPWP: 10.000.000.0-258.288
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[9px] font-black uppercase tracking-wider text-slate-800">
                Dokumen Resmi Internal
              </span>
              <p className="text-[9px] text-slate-500 mt-1 font-mono">
                No: {docNumber}
              </p>
            </div>
          </div>

          {/* 2. JUDUL DOKUMEN & METADATA */}
          <div className="text-center mb-4 print:mb-3">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              LAPORAN REKAPITULASI FAKTUR &amp; ARUS KAS
            </h2>
            <div className="inline-flex items-center gap-2.5 mt-1 px-3 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-medium text-slate-700">
              <span><strong>Periode:</strong> {periodLabel}</span>
              <span>•</span>
              <span><strong>Filter:</strong> {statusLabel}</span>
              <span>•</span>
              <span><strong>Total:</strong> {invoices.length} Faktur</span>
            </div>
          </div>

          {/* 3. RINGKASAN EKSEKUTIF (FINANCIAL SUMMARY CARDS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 print:mb-4">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Total Omzet Tagihan</span>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                Rp {Number(kpis.totalOmzet || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                {invoices.length} transaksi tercatat
              </p>
            </div>

            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 block">Total Kas Lunas</span>
              <p className="text-sm font-black text-emerald-700 mt-0.5">
                Rp {Number(kpis.totalLunas || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-[9px] text-emerald-600 mt-0.5">
                {kpis.countLunas || 0} transaksi lunas
              </p>
            </div>

            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 block">Piutang / Pending</span>
              <p className="text-sm font-black text-amber-800 mt-0.5">
                Rp {Number(kpis.totalPending || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-[9px] text-amber-600 mt-0.5">
                {kpis.countPending || 0} belum bayar
              </p>
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 block">Rasio Pelunasan</span>
              <p className="text-sm font-black text-blue-800 mt-0.5">
                {kpis.totalOmzet > 0 
                  ? `${Math.round(((kpis.totalLunas || 0) / kpis.totalOmzet) * 100)}%` 
                  : '100%'}
              </p>
              <p className="text-[9px] text-blue-600 mt-0.5">
                {kpis.countVerify > 0 ? `${kpis.countVerify} verifikasi bukti` : 'Kas lancar'}
              </p>
            </div>
          </div>

          {/* 4. TABEL DETAIL TRANSAKSI (TABLE FIXED A4) */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-6 print:rounded-none print:border-slate-400">
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-[9px] uppercase tracking-wider print:bg-slate-200">
                  <th className="py-2 px-1.5 text-center">No</th>
                  <th className="py-2 px-2">No. Invoice &amp; Tgl</th>
                  <th className="py-2 px-2">Kode Tiket</th>
                  <th className="py-2 px-2">Nama Pelanggan</th>
                  <th className="py-2 px-2">Layanan &amp; Unit</th>
                  <th className="py-2 px-1 text-center">Status</th>
                  <th className="py-2 px-2 text-right">Total (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[10px]">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 italic">
                      Tidak ada faktur dalam filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => {
                    const invDate = inv.jadwal_mulai || inv.created_at;
                    const dateFormatted = invDate 
                      ? new Date(invDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '-';
                    const customerName = inv.customer?.nama || inv.customer_nama || inv.nama || 'Pelanggan';
                    const customerPhone = inv.customer?.kontak || inv.kontak || '';
                    const serviceName = inv.layanan?.nama || inv.nama_layanan || 'Servis AC';
                    const unitCount = inv.unit || inv.jumlah_unit || 1;
                    const totalTagihan = Number(inv.total || 0);

                    return (
                      <tr key={inv.id || idx} className="hover:bg-slate-50/80 transition-colors break-inside-avoid page-break-inside-avoid">
                        <td className="py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2">
                          <span className="font-bold text-slate-900 block font-mono text-[9px] truncate">{inv.invNo || `INV-${inv.id}`}</span>
                          <span className="text-[9px] text-slate-500 block">{dateFormatted}</span>
                        </td>
                        <td className="py-1.5 px-2 font-mono text-[9px] text-blue-700 font-bold break-all">
                          {inv.kode_booking || `BK-${inv.id}`}
                        </td>
                        <td className="py-1.5 px-2">
                          <span className="font-bold text-slate-900 block truncate">{customerName}</span>
                          {customerPhone && <span className="text-[9px] text-slate-500 block">{customerPhone}</span>}
                        </td>
                        <td className="py-1.5 px-2">
                          <span className="font-medium text-slate-800 block truncate">{serviceName}</span>
                          <span className="text-[9px] text-slate-500">{unitCount} Unit</span>
                        </td>
                        <td className="py-1.5 px-1 text-center">
                          {inv.isPaid ? (
                            <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                              LUNAS
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-bold">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                          Rp {totalTagihan.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 break-inside-avoid page-break-inside-avoid print:bg-slate-200">
                  <td colSpan={6} className="py-2 px-2 text-right uppercase tracking-wider text-[10px]">
                    Total Keseluruhan ({invoices.length} Transaksi):
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-xs font-black text-blue-700">
                    Rp {Number(kpis.totalOmzet || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. LEMBAR PENGESAHAN & TANDA TANGAN */}
          <div className="grid grid-cols-2 gap-8 pt-3 border-t border-slate-200 text-center break-inside-avoid page-break-inside-avoid">
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Mengetahui &amp; Menyetujui,</p>
              <p className="font-bold text-slate-800 text-[11px]">Pimpinan / Direktur</p>
              <div className="h-14 flex items-end justify-center">
                <span className="text-[9px] text-slate-300 italic">( Tanda Tangan &amp; Stempel )</span>
              </div>
              <p className="font-bold text-slate-900 mt-1 text-[11px]">
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">CV. NARA TEKNINDOTAMA</p>
            </div>

            <div>
              <p className="text-[10px] text-slate-500 mb-1">Bogor, {formattedDate}</p>
              <p className="font-bold text-slate-800 text-[11px]">Bagian Administrasi &amp; Keuangan</p>
              <div className="h-14 flex items-end justify-center">
                <span className="text-[9px] text-slate-300 italic">( Tanda Tangan Kasir )</span>
              </div>
              <p className="font-bold text-slate-900 mt-1 text-[11px]">
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">Staff Administrasi Keuangan</p>
            </div>
          </div>

          {/* 6. FOOTER DOKUMEN */}
          <div className="mt-6 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400">
            <span>Sistem Informasi Operasional &amp; Keuangan CV. NARA TEKNINDOTAMA (Nara AC)</span>
            <span>Dicetak pada: {formattedDateTime} WIB</span>
          </div>

        </div>

      </div>

    </div>
  );
}
