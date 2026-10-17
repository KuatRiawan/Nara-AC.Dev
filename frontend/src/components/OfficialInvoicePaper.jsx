import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { cn } from '../lib/utils';
import { ShieldCheck, CheckCircle2, Clock, CreditCard, Building2 } from 'lucide-react';

export default function OfficialInvoicePaper({ booking, isPaidOverride, paymentSettings }) {
  const b = booking || {};

  const [internalPaymentSettings, setInternalPaymentSettings] = useState({
    accounts: [
      { id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' },
      { id: '2', bank_name: 'Mandiri', account_number: '137-00-9821-4451', account_holder: 'CV NARA TEKNINDOTAMA' },
    ],
    instruction_note: 'Tersedia juga opsi pembayaran tunai atau QRIS resmi setelah pekerjaan selesai di lokasi.',
  });

  useEffect(() => {
    if (paymentSettings) {
      setInternalPaymentSettings(paymentSettings);
      return;
    }
    let isMounted = true;
    api.get('/settings/payment-accounts')
      .then((res) => {
        const data = (res && Array.isArray(res.accounts))
          ? res
          : (res?.data?.accounts ? res.data : (res?.data?.data?.accounts ? res.data.data : null));
        if (isMounted && data && Array.isArray(data.accounts)) {
          setInternalPaymentSettings(data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [paymentSettings]);

  const activePayment = paymentSettings || internalPaymentSettings;
  const kodeBooking = b.kode_booking || (b.id ? `AC-${b.id}` : 'AC-0000');

  const invNumber = useMemo(() => {
    if (b.invNo) return b.invNo;
    if (b.inv_no) return b.inv_no;
    const year = new Date().getFullYear();
    const rawId = b.id || b.booking_id || b.data?.id;
    if (rawId) {
      return `INV/NARA/${year}/${String(rawId).padStart(5, '0')}`;
    }
    if (typeof kodeBooking === 'string' && kodeBooking !== 'AC-0000') {
      const parts = kodeBooking.split('-');
      if (parts.length >= 2) {
        return `INV/NARA/${year}/${parts[1].slice(0, 12)}`;
      }
      return `INV/NARA/${year}/${kodeBooking.slice(0, 10)}`;
    }
    return `INV/NARA/${year}/00001`;
  }, [b.invNo, b.inv_no, b.id, b.booking_id, b.data, kodeBooking]);

  const customerNama = b.customer_nama_unmasked
    || b.customer_nama
    || (typeof b.customer?.nama === 'string' ? b.customer.nama : '')
    || (typeof b.nama === 'string' ? b.nama : '')
    || (typeof b.nama_customer === 'string' ? b.nama_customer : '')
    || 'Pelanggan NARA AC';

  const customerKontak = b.kontak_terdaftar_unmasked
    || (typeof b.kontak === 'string' ? b.kontak : '')
    || (typeof b.customer?.kontak === 'string' ? b.customer.kontak : '')
    || '-';

  const customerAlamat = b.alamat_unmasked
    || (typeof b.alamat === 'string' && b.alamat !== '[Alamat Disamarkan]' ? b.alamat : '')
    || (typeof b.customer?.alamat === 'string' ? b.customer.alamat : '')
    || (typeof b.alamat === 'string' ? b.alamat : '-');

  const keluhan = typeof b.keluhan === 'string' ? b.keluhan : '';
  const jadwalMulai = b.jadwal_mulai;
  const teknisiNama = (typeof b.teknisi_lengkap === 'string' ? b.teknisi_lengkap : '')
    || (typeof b.teknisi?.nama === 'string' ? b.teknisi.nama : '')
    || (typeof b.teknisi === 'string' ? b.teknisi : '')
    || 'Belum Ditugaskan';

  const namaLayanan = (typeof b.layanan === 'string' ? b.layanan : '')
    || (typeof b.layanan?.nama === 'string' ? b.layanan.nama : '')
    || (typeof b.layanan?.nama_layanan === 'string' ? b.layanan.nama_layanan : '')
    || (typeof b.nama_layanan === 'string' ? b.nama_layanan : '')
    || 'Cuci AC Standard';

  const basePrice = Number(b.harga || b.layanan?.harga || b.basePrice || 75000);

  const invoiceItems = useMemo(() => {
    const sourceItems = Array.isArray(b.service_items) && b.service_items.length > 0
      ? b.service_items
      : (Array.isArray(b.items) && b.items.length > 0
          ? b.items.filter((it) => it.jenis !== 'sparepart')
          : []);

    if (sourceItems.length > 0) {
      return sourceItems.map((it) => ({
        nama: it.nama_layanan || it.nama || namaLayanan,
        units: Number(it.jumlah_unit || 1),
        hargaSatuan: Number(it.harga_satuan || it.harga || basePrice),
        subtotal: Number(
          it.subtotal != null
            ? it.subtotal
            : Number(it.harga_satuan || it.harga || basePrice) * Number(it.jumlah_unit || 1)
        ),
        catatan: it.catatan || '',
      }));
    }
    const defaultUnits = Number(b.jumlah_unit || b.unit || 1);
    return [{
      nama: namaLayanan,
      units: defaultUnits,
      hargaSatuan: basePrice,
      subtotal: basePrice * defaultUnits,
      catatan: '',
    }];
  }, [b.service_items, b.items, b.jumlah_unit, b.unit, namaLayanan, basePrice]);

  const isMember = Boolean(b.is_member || b.customer?.is_member || b.customer_is_member);

  const subtotalJasa = useMemo(() => {
    if (b.subtotal_jasa !== undefined) return Number(b.subtotal_jasa);
    return invoiceItems.reduce((acc, it) => acc + it.subtotal, 0);
  }, [b.subtotal_jasa, invoiceItems]);

  const sparepartItems = useMemo(() => {
    if (Array.isArray(b.sparepart_items) && b.sparepart_items.length > 0) {
      return b.sparepart_items.map((p) => ({
        nama: p.nama_layanan || p.nama || p.nama_item || 'Suku Cadang / Material',
        qty: Number(p.jumlah_unit || p.qty || p.jumlah || 1),
        satuan: p.satuan || 'pcs',
        hargaSatuan: Number(p.harga_satuan || p.hargaSatuan || p.harga_jual || p.harga || 0),
        subtotal: Number(
          p.subtotal != null
            ? p.subtotal
            : Number(p.jumlah_unit || p.qty || p.jumlah || 1) * Number(p.harga_satuan || p.hargaSatuan || p.harga_jual || 0)
        ),
      }));
    }
    if (Array.isArray(b.pemakaian_inventory) && b.pemakaian_inventory.length > 0) {
      return b.pemakaian_inventory.map((p) => ({
        nama: p.nama || p.nama_item || 'Suku Cadang / Material',
        qty: Number(p.jumlah || 1),
        satuan: p.satuan || 'pcs',
        hargaSatuan: Number(p.harga_jual || p.harga_satuan || p.harga || 0),
        subtotal: Number(p.total_harga || (Number(p.jumlah || 1) * Number(p.harga_jual || p.harga_satuan || 0))),
      }));
    }
    return [];
  }, [b.sparepart_items, b.pemakaian_inventory]);

  const subtotalSparepart = useMemo(() => {
    if (b.subtotal_sparepart !== undefined) return Number(b.subtotal_sparepart);
    return sparepartItems.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
  }, [b.subtotal_sparepart, sparepartItems]);

  const subtotal = subtotalJasa + subtotalSparepart;

  const { discount, discountLabel } = useMemo(() => {
    if (b.discount !== undefined) {
      return {
        discount: Number(b.discount),
        discountLabel: b.discount_reason || b.discount_label || 'Diskon Membership 10% (Khusus Biaya Jasa)',
      };
    }
    if (isMember) {
      return {
        discount: Math.round(subtotalJasa * 0.1),
        discountLabel: 'Diskon Membership 10% (Khusus Biaya Jasa)',
      };
    }
    return { discount: 0, discountLabel: '' };
  }, [subtotalJasa, isMember, b.discount, b.discount_reason, b.discount_label]);

  const total = b.total !== undefined ? Number(b.total) : (subtotal - discount);

  const invoiceType = b.invoice_type || (b.status === 'done' || subtotalSparepart > 0 ? 'final' : 'initial');
  const isFinalInvoice = invoiceType === 'final';
  const invoiceTypeLabel = isFinalInvoice ? 'Invoice Final' : 'Invoice Awal (Estimasi)';

  const isPaid = isPaidOverride !== undefined
    ? Boolean(isPaidOverride)
    : (b.isPaid !== undefined
        ? Boolean(b.isPaid)
        : (b.status_pembayaran === 'paid' || b.status_pembayaran === 'lunas' || b.status_verifikasi_pembayaran === 'diverifikasi'));

  const isPendingVerification = !isPaid && b.status_verifikasi_pembayaran === 'menunggu_verifikasi';
  const totalDibayar = Number(b.total_dibayar != null ? b.total_dibayar : (isPaid ? total : 0));
  const balanceDue = Number(b.balance_due != null ? b.balance_due : Math.max(0, total - totalDibayar));
  const refundAmount = Number(b.refund_amount != null ? b.refund_amount : Math.max(0, totalDibayar - total));

  const warrantyText = useMemo(() => {
    if (b.garansi) return b.garansi;
    if (b.warrantyText) return b.warrantyText;
    if (b.garansi_hari) return `${b.garansi_hari} Hari Kalender`;
    const sName = namaLayanan.toLowerCase();
    if (sName.includes('freon') && sName.includes('core')) return '45 Hari Kalender';
    if (sName.includes('core') || sName.includes('bongkar') || sName.includes('freon')) return '30 Hari Kalender';
    return '14 Hari Kalender';
  }, [namaLayanan, b.garansi, b.warrantyText, b.garansi_hari]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  const issueDateStr = formatDate(b.selesai_aktual || b.created_at || new Date().toISOString());

  return (
    <div
      id="printable-invoice"
      className="p-5 sm:p-8 bg-white text-slate-900 font-sans print:p-0 print:m-0 print:w-full print:border-none print:shadow-none space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-start gap-3.5">
          <img
            src="/images/logo.png"
            alt="Logo CV. Nara Teknindotama"
            className="h-12 w-auto object-contain shrink-0 mt-0.5"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                CV. NARA TEKNINDOTAMA
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                NARA AC
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
              Jl. Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              WA: 0813-8529-3137 · NIB: 2805250066735 · NPWP: 10.000.000.0-258.288
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border',
                isFinalInvoice
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200'
              )}
            >
              {invoiceTypeLabel}
            </span>
            <span
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border inline-flex items-center gap-1',
                isPaid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isPendingVerification
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
              )}
            >
              {isPaid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Lunas
                </>
              ) : isPendingVerification ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Menunggu Verifikasi
                </>
              ) : (
                'Belum Lunas'
              )}
            </span>
          </div>

          <div className="text-sm sm:text-base font-mono font-extrabold text-slate-900 mt-0.5">
            {invNumber}
          </div>
          <div className="text-xs text-slate-500">
            Kode Tiket: <span className="font-mono font-bold text-blue-700">{kodeBooking}</span> · Tanggal: {issueDateStr}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Ditagihkan Kepada
          </div>
          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>{customerNama}</span>
            {isMember && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                Member (-10% Jasa)
              </span>
            )}
          </div>
          <div className="text-slate-600 font-mono">{customerKontak}</div>
          <div className="text-slate-600 leading-relaxed pt-0.5">{customerAlamat}</div>
          {keluhan && (
            <div className="text-slate-500 pt-1 border-t border-slate-200/60 mt-1.5">
              Catatan Keluhan: {keluhan}
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Detail Kunjungan & Garansi
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Jadwal Servis:</span>
            <span className="font-semibold text-slate-900 text-right">
              {jadwalMulai ? `${formatDate(jadwalMulai)} · ${formatTime(jadwalMulai)} WIB` : issueDateStr}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Teknisi Bertugas:</span>
            <span className="font-semibold text-slate-900 text-right">{teknisiNama}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Metode & Skema:</span>
            <span className="font-semibold text-slate-900 uppercase text-right">
              {b.metode_pembayaran || 'Transfer'} ({b.skema_pembayaran === 'dp_50' ? 'DP 50%' : b.skema_pembayaran === 'full_upfront' ? 'Bayar di Awal' : 'Bayar Setelah Selesai'})
            </span>
          </div>
          <div className="flex justify-between gap-2 pt-1 border-t border-slate-200/60">
            <span className="text-slate-500">Perlindungan Garansi:</span>
            <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {warrantyText}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">Rincian Layanan & Suku Cadang</th>
                <th className="py-3 px-4 text-center w-20">Qty</th>
                <th className="py-3 px-4 text-right w-32">Harga Satuan</th>
                <th className="py-3 px-4 text-right w-36">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoiceItems.map((item, idx) => (
                <tr key={`svc-${idx}`} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase">
                        Jasa
                      </span>
                      <span className="font-bold text-slate-900">{item.nama}</span>
                    </div>
                    {item.catatan && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.catatan}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                    {item.units} unit
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    Rp {item.hargaSatuan.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    Rp {item.subtotal.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}

              {sparepartItems.map((item, idx) => (
                <tr key={`part-${idx}`} className="bg-amber-50/20">
                  <td className="py-3 px-4 text-center font-mono text-slate-500">
                    {invoiceItems.length + idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase">
                        Suku Cadang
                      </span>
                      <span className="font-bold text-slate-900">{item.nama}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                    {item.qty} {item.satuan || 'pcs'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    Rp {Number(item.hargaSatuan || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pt-1 avoid-page-break">
        <div className="sm:col-span-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-600" />
            Rekening Resmi Pembayaran
          </div>
          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/80 font-mono text-xs">
            {(activePayment?.accounts?.length ? activePayment.accounts : [
              { id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' },
            ]).map((acc, idx) => (
              <div key={acc.id || idx} className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800">{acc.bank_name}: {acc.account_number}</span>
                <span className="text-[11px] text-slate-500 font-sans">a.n {acc.account_holder}</span>
              </div>
            ))}
          </div>
          {activePayment?.instruction_note && (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {activePayment.instruction_note}
            </p>
          )}
        </div>

        <div className="sm:col-span-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal Biaya Jasa</span>
            <span className="font-mono font-semibold text-slate-900">Rp {subtotalJasa.toLocaleString('id-ID')}</span>
          </div>

          {subtotalSparepart > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Suku Cadang (0% Diskon)</span>
              <span className="font-mono font-semibold text-slate-900">Rp {subtotalSparepart.toLocaleString('id-ID')}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>{discountLabel}</span>
              <span className="font-mono">-Rp {discount.toLocaleString('id-ID')}</span>
            </div>
          )}

          <div className="pt-2.5 border-t border-slate-300 flex justify-between items-baseline">
            <span className="font-extrabold text-slate-900 uppercase tracking-wide">Total Tagihan</span>
            <span className="text-lg sm:text-xl font-black text-blue-700 font-mono">
              Rp {total.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/80 space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Jumlah Telah Dibayar</span>
              <span className="font-mono font-semibold text-slate-800">Rp {totalDibayar.toLocaleString('id-ID')}</span>
            </div>

            {balanceDue > 0 && (
              <div className="flex justify-between text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 rounded-lg font-bold">
                <span>Sisa Tagihan</span>
                <span className="font-mono">Rp {balanceDue.toLocaleString('id-ID')}</span>
              </div>
            )}

            {refundAmount > 0 && (
              <div className="flex justify-between text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 rounded-lg font-bold">
                <span>Kelebihan Bayar (Refund)</span>
                <span className="font-mono">Rp {refundAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
        <div>
          Dokumen invoice elektronik sah diterbitkan oleh sistem resmi <strong>CV. Nara Teknindotama</strong>.
        </div>
        <div className="font-mono text-slate-400">
          Ref: {kodeBooking} · {invNumber}
        </div>
      </div>
    </div>
  );
}
