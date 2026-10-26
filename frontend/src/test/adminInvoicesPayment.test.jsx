import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminInvoices from '../pages/admin/AdminInvoices';
import api from '../api';
import * as toastModule from '../components/ui/toast';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
vi.spyOn(toastModule, 'useToast').mockReturnValue({
  success: mockShowSuccess,
  error: mockShowError,
  toast: vi.fn(),
});

describe('Admin Invoices Payment Status Persistence', () => {
  const mockBookings = [
    {
      id: 101,
      kode_booking: 'AC-101A',
      status: 'scheduled',
      status_pembayaran: 'pending',
      customer: { nama: 'Andi Pratama', kontak: '081234567890' },
      layanan: { nama: 'Cuci AC Standard', harga: 75000 },
      jumlah_unit: 1,
      total_biaya: 75000,
      jadwal_mulai: '2026-10-15T09:00:00Z',
    },
    {
      id: 102,
      kode_booking: 'AC-102B',
      status: 'done',
      status_pembayaran: 'paid',
      customer: { nama: 'Budi Santoso', kontak: '081987654321' },
      layanan: { nama: 'Service Besar AC', harga: 150000 },
      jumlah_unit: 2,
      total_biaya: 285000,
      jadwal_mulai: '2026-10-14T10:00:00Z',
    },
    {
      id: 103,
      kode_booking: 'AC-103C',
      status: 'scheduled',
      status_pembayaran: 'pending',
      status_verifikasi_pembayaran: 'menunggu_verifikasi',
      bukti_pembayaran_url: '/api/v1/files/proof_test.jpg',
      customer: { nama: 'Citra Dewi', kontak: '081333444555' },
      layanan: { nama: 'Cuci AC Inverter', harga: 90000 },
      jumlah_unit: 1,
      total_biaya: 90000,
      jadwal_mulai: '2026-10-18T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.get.mockImplementation((url) => {
      if (url === '/bookings') {
        return Promise.resolve(mockBookings);
      }
      if (url === '/settings/payment-accounts') {
        return Promise.resolve({
          accounts: [
            { id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' }
          ],
          instruction_note: 'Note'
        });
      }
      return Promise.resolve([]);
    });
  });

  it('loads persistent payment status from backend API data directly', async () => {
    render(<AdminInvoices />);

    await waitFor(() => {
      expect(screen.getAllByText('Andi Pratama')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Budi Santoso')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('Tandai Lunas')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Batal Lunas')[0]).toBeInTheDocument();
  });

  it('calls backend API patch when toggling payment status and updates UI', async () => {
    api.patch.mockResolvedValueOnce({
      id: 101,
      status_pembayaran: 'paid',
      message: 'Status pembayaran berhasil diperbarui menjadi Lunas.'
    });

    render(<AdminInvoices />);

    await waitFor(() => {
      expect(screen.getAllByText('Tandai Lunas')[0]).toBeInTheDocument();
    });

    const markPaidBtn = screen.getAllByText('Tandai Lunas')[0];
    fireEvent.click(markPaidBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/bookings/101/payment-status', {
        status_pembayaran: 'paid'
      });
      expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('Lunas'));
    });
  });

  it('shows error toast when payment status patch fails', async () => {
    api.patch.mockRejectedValueOnce({
      error: { message: 'Database connection error' }
    });

    render(<AdminInvoices />);

    await waitFor(() => {
      expect(screen.getAllByText('Tandai Lunas')[0]).toBeInTheDocument();
    });

    const markPaidBtn = screen.getAllByText('Tandai Lunas')[0];
    fireEvent.click(markPaidBtn);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('Database connection error'));
    });
  });

  it('renders payment proof verification modal without throwing ReferenceError', async () => {
    render(<AdminInvoices />);

    await waitFor(() => {
      expect(screen.getAllByText('Citra Dewi')[0]).toBeInTheDocument();
    });

    const verifyBtns = screen.getAllByRole('button', { name: /Verifikasi Bukti/i });
    expect(verifyBtns.length).toBeGreaterThan(0);
    fireEvent.click(verifyBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Verifikasi Bukti Transfer')).toBeInTheDocument();
      expect(screen.getByText(/Tolak Bukti/i)).toBeInTheDocument();
      expect(screen.getByText(/Terima & Tandai Lunas/i)).toBeInTheDocument();
    });
  });

  it('opens in-page fullscreen lightbox when clicking preview button and closes on ESC', async () => {
    render(<AdminInvoices />);

    await waitFor(() => {
      expect(screen.getAllByText('Citra Dewi')[0]).toBeInTheDocument();
    });

    const verifyBtns = screen.getAllByRole('button', { name: /Verifikasi Bukti/i });
    fireEvent.click(verifyBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Verifikasi Bukti Transfer')).toBeInTheDocument();
    });

    const openFullBtn = screen.getByRole('button', { name: /Buka Lampiran Ukuran Penuh/i });
    expect(openFullBtn).toBeInTheDocument();
    fireEvent.click(openFullBtn);

    await waitFor(() => {
      expect(screen.getByText('Lampiran Bukti Transfer')).toBeInTheDocument();
      expect(screen.getByText(/Tutup \(ESC\)/i)).toBeInTheDocument();
    });

    // Press Escape to close lightbox
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Lampiran Bukti Transfer')).not.toBeInTheDocument();
      // Verification modal remains open
      expect(screen.getByText('Verifikasi Bukti Transfer')).toBeInTheDocument();
    });
  });
});

