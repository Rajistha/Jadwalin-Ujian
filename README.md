# JadwalinUjian

> Upload KRS, jadwal ujian langsung ketemu.

Web app untuk mencari jadwal UAS FILKOM Universitas Brawijaya dari screenshot KRS. Upload tabel KRS dari SIAM UB, lalu jadwal ujian, jam, dan ruangan langsung tampil dalam satu tabel yang bisa disimpan.

Periode data saat ini: UAS Ganjil 2026/2027 (30 November - 11 Desember 2026).

## Fitur

- Upload screenshot KRS lewat klik, drag and drop, atau paste (Ctrl+V).
- Membaca kode mata kuliah, nama, dan kelas dari gambar, lalu mencocokkannya dengan jadwal UAS.
- Tabel jadwal yang bisa diurutkan berdasarkan tanggal, jam, atau nama mata kuliah.
- Penanda jadwal bentrok.
- Ringkasan: total mata kuliah dan SKS, ujian pertama, ujian terakhir, status jadwal.
- Unduh sebagai PNG (tabel), PDF, atau wallpaper layar kunci HP (mode terang dan gelap).

## Teknologi

- Next.js (App Router), React, TypeScript
- Tailwind CSS
- Gemini API untuk membaca isi screenshot
- Fuse.js untuk pencocokan nama mata kuliah
- html-to-image dan jsPDF untuk ekspor

## Menjalankan Lokal

Prasyarat: Node.js 20 atau lebih baru.

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev
```

Buka http://localhost:3000.

### Environment

| Variabel | Fungsi |
|---|---|
| `GEMINI_API_KEY` | Kunci API untuk membaca screenshot KRS |
| `GEMINI_MODEL` | Model Gemini yang dipakai (opsional, bawaan gemini-3.8-flash) |
| `APP_URL` | URL publik situs, dipakai untuk metadata dan OG image |

Tanpa `GEMINI_API_KEY`, endpoint ekstraksi tidak bisa membaca gambar.

## Struktur Proyek

```
app/
  api/extract/       membaca screenshot dan mengembalikan daftar mata kuliah
  api/match/         mencocokkan mata kuliah dengan jadwal UAS
  opengraph-image.tsx
  page.tsx           halaman utama
components/          dropzone, tombol cari, loading, kartu ringkasan, tabel jadwal
lib/
  raw_jadwal.csv     data mentah jadwal UAS
  realSchedules.ts   jadwal hasil olahan (dibuat oleh script)
  types.ts, utils.ts
scripts/
  parseSchedules.js  mengubah raw_jadwal.csv menjadi realSchedules.ts
```

## Memperbarui Jadwal

1. Ganti isi `lib/raw_jadwal.csv` dengan data terbaru.
2. Jalankan `node scripts/parseSchedules.js`.
3. Cek `lib/realSchedules.ts`, terutama nama periode dan rentang tanggalnya.

## Batasan

- Hanya mendukung FILKOM.
- Hasil pembacaan gambar bergantung pada kualitas screenshot. Pastikan kolom kode MK, nama MK, dan kelas terbaca jelas.
- Jadwal di aplikasi ini bukan sumber resmi. Selalu cek ulang di SIAM UB atau pengumuman fakultas.
- Endpoint ekstraksi dibatasi 60 permintaan per 15 menit per IP di production.

## Build

```bash
npm run build
npm run start
```
