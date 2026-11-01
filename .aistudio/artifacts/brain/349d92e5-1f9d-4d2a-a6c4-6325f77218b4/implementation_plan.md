# Optimasi Scroll Halaman & Navigasi Tetap Profesional — Lomba Guru Inspiratif 2026 (FK3S Kec. Beji)

Pembaruan ini memastikan seluruh halaman aplikasi (**Beranda Utama**, **Juknis & Pengumpulan Karya**, **Pop-Up Rekap Sekolah**, **Portal Dewan Juri**, dan **Dashboard Administrator**) dapat di-*scroll* secara leluasa dan mulus dari atas ke bawah pada semua ukuran layar (Desktop, Tablet, dan HP), sementara **Header Navigasi Atas** dan **Navigasi Melayang Bawah (Mobile/Tablet)** tetap terkunci (*fixed*) di posisinya tanpa ikut bergeser.

## User Review & Critical Decisions

> [!IMPORTANT]
> Sebelumnya, pembatasan `overflow-hidden` pada kontainer layar (`lg:overflow-hidden` dan `h-[100dvh]`) mengunci guliran halaman ketika isi tab atau tabel melebihi tinggi layar. Dengan arsitektur baru ini:
> - **Confirmed Decision 1 (Scroll Halaman Penuh & Bebas Terpotong)**: Seluruh halaman menggunakan *natural document/viewport scrolling* (`min-h-screen overflow-y-auto overflow-x-hidden`) dengan ruang bantalan atas (`pt-16`) dan bawah (`pb-40 lg:pb-10`), sehingga semua konten, grafik batang, tabel, dan formulir dapat di-*scroll* dengan lancar di Desktop, Tablet, maupun HP.
> - **Confirmed Decision 2 (Navigasi Tetap / Fixed 100% Stabil)**:
>   - **Header Atas**: Dipasang `fixed top-0 inset-x-0 h-16 z-40` di seluruh layar sehingga selalu menempel di bagian paling atas saat halaman di-*scroll*.
>   - **Navigasi Melayang Bawah (HP & Tablet)**: Dipasang `fixed bottom-2.5 inset-x-0 z-50 lg:hidden` dengan tata letak grid terkunci (**4 kolom sub-tab + 5 kolom menu utama**) sehingga tetap melayang di bawah layar dan tidak bergeser secara horizontal maupun vertikal.
>   - **Sub-Tab Desktop & Sidebar**: Menggunakan `sticky top-20 z-30` agar navigasi tab pada layar Desktop tetap mudah dijangkau saat pengguna menggulir halaman panjang.

---

## 1. Overview & Core Concept

- **What It Does**: Menghadirkan pengalaman navigasi dan pembacaan konten yang profesional, responsif, dan bebas hambatan pada portal resmi **Lomba Guru Inspiratif 2026 FK3S Kec. Beji**. Pengguna dapat menggulir seluruh halaman dengan mulus tanpa ada bagian formulir, grafik rekap sekolah, atau tabel nilai yang terpotong, sementara tombol navigasi selalu siap dijangkau di posisi tetapnya.
- **Target Audience / Persona**:
  - **Guru SD se-Kecamatan Beji**: Membaca Juknis, memantau Grafik Rekap Sekolah (28 SD dari database `SEKOLAH`), dan mengisi Formulir Pengumpulan Karya melalui HP, Tablet, atau Laptop.
  - **Dewan Juri**: Meninjau video/dokumen karya peserta dan mengisi rubrik penilaian pada layar terpisah (*split-screen*) yang dapat di-*scroll* penuh.
  - **Administrator FK3S Kec. Beji**: Mengelola 12 menu administrasi, memverifikasi peserta, memantau juri, dan mencetak rekap nilai.
- **Key Value**: Menggabungkan keleluasaan *full-page vertical scrolling* dengan stabilitas *fixed navigation bars*, memastikan 100% fitur interaktif berfungsi optimal di semua perangkat.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Eksplorasi Beranda & Juknis Tanpa Terpotong**: Saat pengguna membuka Beranda Utama atau Juknis & Pengumpulan Karya, halaman dapat di-*scroll* ke bawah dengan mulus. Header atas (`FK3S KEC. BEJI`, pengalih halaman, tombol Mode Gelap/Cerah, `Rekap Sekolah`, `Portal Juri`, dan `Kirim Karya`) tetap menempel di puncak layar.
  2. **Peralihan Sub-Tab Instan dengan Auto-Scroll**: Ketika pengguna memilih sub-tab (baik melalui bar tab *sticky* di Desktop maupun melalui Navigasi Melayang Bawah di HP/Tablet), konten langsung berganti dan posisi baca otomatis menyesuaikan dengan rapi.
  3. **Pop-Up Halaman Rekap & Statistik Sekolah**: Saat tombol `Rekap Sekolah` diklik, jendela pop-up tampil dengan *header* tetap di bagian atas modal dan area isi yang dapat di-*scroll* mulus untuk melihat 5 kartu statistik, pencarian pintar, grafik batang 28 SD sesuai nama di DB (`SEKOLAH`), serta tabel peserta publik.
  4. **Penjurian & Administrasi Lancar**: Pada Portal Juri dan Dashboard Admin, *sidebar* di Desktop menempel secara *sticky*, sedangkan di HP & Tablet navigasi melayang bawah tetap terkunci di bagian bawah layar sementara tabel dan formulir dapat di-*scroll* penuh.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: *High-Contrast Executive Educational Portal* — bersih, tegas, berwibawa, dan mudah dibaca oleh seluruh guru dan pengawas.
  - *Color Palette & Mood*:
    - Mode Cerah (*Default*): Latar utama Putih Bersih (`#FFFFFF`) & Abu-abu Terang (`#F8FAFC`), Aksen Utama Biru Royal (`#004AAD`), Aksen Sekunder Emas Oranye (`#FFB800` / `#EA580C`), Teks Utama Biru Tua Pekat (`#0A192F`).
    - Mode Gelap: Latar Navy Gelap (`#070B14`) & permukaan kartu (`#0D152A`), Aksen Emas (`#FFB800`) dan Biru Cerah, Teks Putih Tajam (`#FFFFFF`).
  - *Typography & Hierarchy*: `Outfit` (Display/Judul Utama dengan ketebalan tegas), `Plus Jakarta Sans` (Teks isi dan label formulir yang jelas), serta `JetBrains Mono` (`tabular-nums` untuk nomor peserta, hitung mundur, persentase grafik, dan skor juri).
  - *Component Styling & Layout*: Kontainer selebar `1440px` di Desktop dengan pembagian 2 kolom proporsional (`5 kolom` kartu identitas utama yang *sticky* di kiri + `7 kolom` ruang kerja tab yang dapat di-*scroll* penuh di kanan), garis batas tegas `2px`, dan sudut membulat modern (`rounded-2xl` / `rounded-3xl`).
- **Interactive Feedback & Motion**: Transisi warna dan tombol responsif (`150ms`), indikator tab aktif yang kontras, serta pengguliran halus (`smooth scroll`) saat berpindah halaman atau membuka formulir pengumpulan karya.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Arsitektur Scroll Dokumen (`window` / `min-h-screen`) vs. Kontainer Terkunci (`h-screen overflow-hidden`)**
  - *Chosen Approach*: Menggunakan `min-h-screen flex flex-col pt-16 pb-40 lg:pb-12 overflow-x-hidden` pada pembungkus utama dengan `fixed top-0 inset-x-0 z-40` untuk Header Atas dan `fixed bottom-2.5 inset-x-0 z-50 lg:hidden` untuk Navigasi Melayang Bawah.
  - *Why*: Menjamin halaman selalu bisa di-*scroll* di semua browser (termasuk browser HP/Tablet ketika papan ketik virtual muncul saat mengisi formulir) sekaligus memastikan navigasi atas dan bawah benar-benar terkunci pada layar (`viewport`) dan tidak pernah ikut tergeser.
  - *Alternatives Considered*: Mengunci `body` dengan `overflow-hidden` dan menaruh `overflow-y-auto` pada `<main>` di Desktop, yang menyebabkan konten tab panjang tidak bisa di-*scroll* dengan roda tetikus (*mouse wheel*) pada beberapa resolusi layar.
- **Decision 2: Tata Letak Navigasi Melayang Bawah Tanpa Scroll Horizontal**
  - *Chosen Approach*: Menyusun sub-tab dalam `grid-cols-4` dan menu utama dalam `grid-cols-5` di dalam dok navigasi melayang bawah pada mode HP & Tablet.
  - *Why*: Menghilangkan perilaku geser samping (*horizontal swipe*) di dalam bar navigasi, sehingga bar navigasi beserta seluruh tombol di dalamnya benar-benar diam dan stabil saat disentuh.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FIXED TOP HEADER (fixed top-0 inset-x-0 h-16 z-40)                           │
│ [Logo FK3S + Identitas]   [1. Beranda | 2. Juknis (Desktop)]   [Aksi Cepat] │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ SCROLLABLE DOCUMENT VIEWPORT (min-h-screen pt-16 pb-40 lg:pb-12)             │
│                                                                              │
│  ┌───────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ KOLOM KIRI (lg:sticky top-20) │  │ KOLOM KANAN (Scrollable Workspace)  │  │
│  │ • Judul Lomba & FK3S Kec Beji │  │ • Bar Sub-Tab Desktop (sticky)      │  │
│  │ • Logo HGN 2026 Tanpa Bingkai │  │ • Konten 8 Tab Beranda / 8 Tab      │  │
│  │ • Hitung Mundur & Statistik   │  │   Juknis & Formulir Pengumpulan     │  │
│  │ • Tombol CTA Cepat            │  │ • Grafik Batang & Tabel Rekap SD    │  │
│  └───────────────────────────────┘  └─────────────────────────────────────┘  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ FIXED MOBILE/TABLET FLOATING NAV (fixed bottom-2.5 inset-x-0 z-50 lg:hidden) │
│ • Baris 1 (Grid 4x2 Terkunci): 8 Sub-Tab Kontekstual (Beranda / Juknis)      │
│ • Baris 2 (Grid 5 Kolom): [Beranda] [Juknis] [Rekap SD] [Kirim] [Portal Juri]│
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Sinkronisasi Tabel `SEKOLAH` (28 SD)**: Mengambil daftar sekolah resmi dari Google Sheets (`SEKOLAH`) dan menyajikannya dengan teks murni `{school_name}` pada seluruh dropdown pendaftaran, filter admin, grafik batang partisipasi, dan tabel rekap publik.
  - **Privasi Rekap Peserta Publik**: Hanya menampilkan `Asal Sekolah`, `Nama Guru Peserta`, dan `Judul Inovasi Pembelajaran` pada halaman publik, sedangkan tautan berkas Google Drive, video, modul ajar, WhatsApp, dan nilai tetap terlindungi di Portal Juri dan Dashboard Admin.
- **Interactive Component & State Mapping**:
  - **Navigasi Atas & Bawah Tetap**: Klik pada tombol halaman (`Beranda`, `Juknis`, `Kirim Karya`) memperbarui `activePage` dan `juknisTab`, menutup modal bila terbuka, dan menjalankan `window.scrollTo({ top: 0, behavior: 'smooth' })`.
  - **Pop-Up Rekap Sekolah (`showSchoolRecapModal`)**: Menampilkan modal dengan `fixed inset-0 z-[60]`, *header* tetap di atas modal, dan area isi `overflow-y-auto` untuk pencarian nama sekolah/guru, filter desa/status/partisipasi, serta interaksi klik batang sekolah untuk menyaring daftar guru.
  - **Portal Juri & Dashboard Admin**: Menggunakan *header* tetap (`fixed top-0`), *sidebar* Desktop *sticky* (`lg:sticky lg:top-16`), area konten yang dapat di-*scroll* penuh, dan navigasi bawah tetap (`fixed bottom-2.5`) pada perangkat HP & Tablet.
