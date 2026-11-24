# JadwalinUjian

> Upload KRS, jadwal ujian langsung ketemu.

Web app untuk mencari jadwal UAS FILKOM Universitas Brawijaya dari screenshot KRS. Upload tabel KRS dari SIAM UB, lalu jadwal ujian, jam, dan ruangan langsung tampil dalam satu tabel yang bisa disimpan.

Periode data saat ini: UAS Ganjil 2026/2027 (30 November - 11 Desember 2026).

## Fitur

- Upload screenshot KRS lewat klik, drag and drop, atau paste (Ctrl+V).
- Membaca kode mata kuliah, nama, dan kelas dari gambar (tema terang maupun gelap), lalu mencocokkannya dengan jadwal UAS sesuai prodi dan kelas.
- Kelas yang tidak terbaca tidak pernah ditebak: pengguna memilih kelasnya sendiri dari daftar kelas yang ada di jadwal.
- Tabel jadwal yang bisa diurutkan berdasarkan tanggal, jam, atau nama mata kuliah.
- Penanda jadwal bentrok.
- Ringkasan: total mata kuliah dan SKS, ujian pertama, ujian terakhir, status jadwal.
- Unduh sebagai PNG (tabel), PDF, atau wallpaper layar kunci HP (mode terang dan gelap).

## Teknologi

- Next.js (App Router), React, TypeScript
- Tailwind CSS
- Tesseract.js untuk membaca screenshot (OCR berjalan di browser, tanpa API key)
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
| `APP_URL` | URL publik situs, dipakai untuk metadata dan OG image |

## Struktur Proyek

```
app/
  api/match/         mencocokkan mata kuliah dengan jadwal UAS
  opengraph-image.tsx
  page.tsx           halaman utama
components/          dropzone, tombol cari, loading, kartu ringkasan, tabel jadwal
lib/
  raw_jadwal.csv     data mentah jadwal UAS
  realSchedules.ts   jadwal hasil olahan (dibuat oleh script)
  ocr.ts             OCR (Tesseract.js) dan parser teks KRS
  types.ts, utils.ts
scripts/
  parseSchedules.js  mengubah raw_jadwal.csv menjadi realSchedules.ts
  test-krs.mts       tes regresi OCR + pencocokan dengan teks KRS asli
```

## Memperbarui Jadwal

1. Ganti isi `lib/raw_jadwal.csv` dengan data terbaru.
2. Jalankan `node scripts/parseSchedules.js`. Baris dengan tanggal bukan format `YYYY-MM-DD` (misalnya `#N/A`) dilewati dan jumlahnya dicetak.
3. Cek `lib/realSchedules.ts`, terutama nama periode dan rentang tanggalnya.
4. Jalankan tes: `npm run dev`, lalu `node --experimental-strip-types scripts/test-krs.mts`.

Kode mata kuliah tidak ada di CSV. Kode yang terbukti dari KRS asli dicatat di `KNOWN_CODES` pada script; matkul lain dicocokkan lewat nama, kelas, dan prodi.

## Batasan

- Hanya mendukung FILKOM.
- Jadwal Magister/S3 yang tanggalnya belum pasti di sumber data (`#N/A`, "Sabtu,...") belum dimasukkan.
- Hasil pembacaan gambar bergantung pada kualitas screenshot. Pastikan kolom kode MK, nama MK, dan kelas terbaca jelas.
- Gunakan screenshot dari tampilan desktop, hanya bagian tabel KRS (dari judul kolom sampai Total SKS). Tampilan HP dan foto kamera tidak didukung.
- Jadwal di aplikasi ini bukan sumber resmi. Selalu cek ulang di SIAM UB atau pengumuman fakultas.

## Build

```bash
npm run build
npm run start
```
