# DESIGN.md: Sistem Desain CV. Nara Teknindotama (Nara AC)

> **Single Source of Truth (`R-37`)** untuk desain antarmuka publik, portal pelanggan, portal teknisi lapangan, dan ruang kendali operasional admin CV. Nara Teknindotama.

## 1. Design Read & Liveliness Dials (`R-31`, Part 3)

- **Dial: ENERGY 2 / RHYTHM 2 / MOTION 2**
- **Alasan (Reason):** Sebagai layanan teknisi tata udara (HVAC) rumah tangga dan komersial B2B di Jabodetabek dengan standar hukum resmi (NIB: 2805250066735), antarmuka membutuhkan otoritas industrial yang bersih, kejelasan status pengerjaan real-time, serta variasi hierarki visual tanpa gimik dekoratif.

| Dial | Level | Implementasi Spesifik |
|---|---|---|
| **ENERGY** | `2` (Balanced) | Permukaan terang berstruktur (`#F8FAFC` / `#FFFFFF`) dengan blok kontras tinggi Navy (`#0F172A`) pada kartu utama (Flagship SOP & Ringkasan Pembayaran) untuk menciptakan jangkar fokus yang tegas. |
| **RHYTHM** | `2` (Varied) | Kombinasi kartu unggulan melebar 2 kolom (Flagship SOP 7 Langkah) berdampingan dengan grid 2 kolom terstruktur, menghindari barisan 6 kartu identik (`R-14`). |
| **MOTION** | `2` (Subtle) | Transisi mikro fungsional 150ms-200ms (`transition-colors`, `transition-shadow`) pada tombol dan kartu interaktif tanpa efek *scale hover* yang menggeser tata letak, serta menghormati `prefers-reduced-motion: reduce` (`R-39`). |

## 2. Identitas & Motif Visual (`R-31`)

- **Motif:** *Precision Air & Technical Ledger* — Menggabungkan garis batas tajam (`1px solid #E2E8F0`), tipografi numerik tabular (`tabular-nums`) untuk transparansi harga/parameter tekanan manifold (PSI) dan arus kompresor (Ampere), serta lencana terverifikasi berbasis SVG.
- **Alasan (Reason):** Pelanggan memesan jasa servis AC karena mencari kepastian harga di awal dan bukti teknis nyata (sebelum/sesudah pengerjaan), bukan klaim pemasaran abstrak.

## 3. Palet Warna & Rasio Kontras WCAG AA (`R-25`, `R-28`, `R-29`)

Maksimal 3 kelompok warna inti ditambah warna status semantik, terverifikasi melalui `.agents/skills/antislop-human/contrast-check.py`:

| Peran | Token / Hex | Kontras pada `#FFFFFF` / `#F8FAFC` | Alasan Penggunaan (1-Line Reason) |
|---|---|---|---|
| **Primary Structural** | `slate-900` (`#0F172A`) | `17.85:1` / `17.06:1` (AAA) | Memberikan otoritas korporat dan keterbacaan maksimal pada judul utama, navigasi, dan CTA primer. |
| **Secondary Body** | `slate-700` (`#334155`) & `slate-600` (`#475569`) | `10.35:1` & `7.58:1` (AAA) | Menjaga kenyamanan baca pada paragraf panjang, deskripsi SOP, dan label formulir tanpa membuat mata cepat lelah. |
| **Muted / Caption** | `slate-500` (`#64748B`) | `4.76:1` / `4.55:1` (AA) | Menggantikan `slate-400` (`2.56:1` gagal AA) untuk teks keterangan sekunder dan *timestamp* di atas latar terang. |
| **Accent / Trust Cooling** | `sky-700` (`#0369A1`) & `blue-600` (`#2563EB`) | `5.93:1` & `4.65:1` (AA) | Merepresentasikan udara dingin yang bersih serta menjadi penanda fokus interaktif (`:focus-visible`) dan aksi utama. |
| **Semantic Status** | Emerald `#059669`, Amber `#D97706`, Rose `#E11D48` | `>= 4.5:1` dengan pasangan latar `*-50` & teks `*-800` | Membedakan status operasional (Selesai/Garansi Aktif, Menunggu Konfirmasi, Darurat/Komplain) secara instan bagi pelanggan dan teknisi. |

## 4. Tipografi & Skala (`R-30`)

- **Font Utama (Heading & Body):** `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
  - **Alasan:** Karakter geometris modern yang dirancang dengan proporsi x-height tinggi sehingga sangat jelas dibaca pada istilah Bahasa Indonesia maupun kode teknis unit AC.
- **Font Numerik & Kode Booking:** `font-mono` (`JetBrains Mono` / `monospace`) + `tabular-nums`
  - **Alasan:** Memastikan kode tiket (`AC-XXXX`), nomor NIB, rincian rupiah pada e-Invoice, dan angka estimasi biaya sejajar vertikal dengan presisi akuntansi.

## 5. Aturan Anti-Slop & Guardrails UI (`R-01` s.d. `R-40`)

1. **Zero Em Dash (`R-02`):** Dilarang menggunakan karakter `—` pada seluruh teks antarmuka, judul halaman, maupun keterangan harga. Gunakan tanda titik dua (`:`), tanda hubung biasa (`-`), atau kalimat terpisah.
2. **Zero Emoji & Zero Generic AI Sparkles (`R-04`):** Dilarang menggunakan emoji (`❄️`, `⚠️`, `💡`, `📍`, `⚡`, `🟢`) atau ikon klise AI (`Sparkles`). Seluruh ikon wajib menggunakan SVG Lucide yang relevan secara domain (`Wind`, `Wrench`, `ShieldCheck`, `Calculator`, `AlertTriangle`, `MapPin`, `Award`).
3. **Zero Fabricated Metrics (`R-17`, `R-36`):** Dilarang mencantumkan angka klaim tanpa sumber seperti `"4.9/5.0"`, `"2.500+ Unit"`, atau `"TLS 1.3"` sebagai hiasan pemasaran. Gunakan fakta operasional nyata: **NIB: 2805250066735**, **SOP 7 Langkah Baku**, dan **Garansi Pengerjaan s.d. 45 Hari**.
4. **Zero Decorative Clutter (`R-07`, `R-09`):** Tidak ada *hero dot-grid overlay*, tidak ada titik status berkedip palsu di atas judul, dan tidak ada komentar dekoratif `===`.
5. **Aksesibilitas & Interaktivitas (`R-25`, `R-32`, `R-39`):** Semua elemen interaktif memiliki kursor `pointer`, indikator `:focus-visible` yang jelas (`2px solid #0369A1`), target sentuh memadai di perangkat *mobile*, serta dukungan penuh `prefers-reduced-motion: reduce`.

