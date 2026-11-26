# Laporan Perbaikan Showcase OOH — v2 Terverifikasi

Tanggal: 2026-11-24
Live: **https://sms.51.79.240.127.sslip.io/** (sertifikat Let's Encrypt sah s/d 2027-02-22)
Repo data: `~/.hermes/cache/scratch/` · Deploy: `/var/www/sms-showcase/`

---

## 1. Ringkasan

Showcase sudah diperbaiki dan live. Angka consumer sekarang **terukur, bukan diasumsikan**, dan setiap situs punya tombol **Open in Google Maps** supaya klien bisa membandingkan sendiri dari HP.

| Metrik | Sebelum | Sesudah |
|---|---|---|
| Sel "none inside 2 km" yang salah | 3.363 (95,5%) | **0** |
| Situp dengan "Toko tanpa nama" prematur | 3.521 sel nol | 0 sel nol tanpa dasar |
| Kafe S-1082 | 0 (fiktif) | **2.807 terukur** |
| POI S-0107 dalam 2 km | 48.708 (salah hitung) | **113.020** (cocok scan independen) |
| Skor mentok di cap | 583 situs (34%) | 0 — max 44,9 |
| Skor berbeda | ~40 nilai | **351 nilai** |
| Pin peta | posisi ilusi | **33.912 POI nyata bernama** |

**Verifikasi silang:** angka yang dilayani (`113.020`) sama persis dengan hasil scan langsung DuckDB tanpa prefilter. Ini yang bisa dipertahankan saat klien tanya "sumbernya mana?".

---

## 2. Yang diperbaiki

### 2.1 State `coverage_unknown` (prioritas #1 brief)

Tiga arti berbeda dulu disatukan dalam satu label `scored_zero`:
1. memang nol POI,
2. layer kota tidak pernah di-import,
3. situs di luar bbox extract.

Sekarang ada state terpisah dan UI menampilkannya:

| State | Arti | Tampilan |
|---|---|---|
| `scored` | ada POI, poin dihitung | `4,5 / 5 · 51 POI @ 2 km` |
| `scored_zero` | terukur nol | `0,0 / 5 · 0 measured` |
| `coverage_unknown` | konteks POI tipis (< 200 POI/2 km) | `0,0 / 5 · coverage unknown` |

Hasilnya: **35 situs** kini berstatus `coverage_unknown` (sebelumnya diam-diam tampil 0), dan **77 situs** membawa flag `provisional` yang jujur (sebelumnya 337 situs all-zero justru `provisional: false`).

### 2.2 Kurva skor yang bisa diaudit

Formula lama membuat 34% situs mentok di nilai maksimum, sehingga rank jadi tidak bermakna. Diganti kurva asimtotik:

```
points = max × (1 − e^(−n/k))
```

dengan `n` = jumlah POI terukur dan `k` = median kategori. Setiap baris di UI menampilkan `n` dan `k`-nya, jadi eksaminer bisa menghitung ulang manual.

Median kategori (terukur atas 1.713 situs): chain A 10 · chain B 8 · transit 12 · campus 292 · café 265 · public building 65 · public area 46.

### 2.3 Pin peta = POI nyata

Sebelumnya pin diletakkan di bearing/distance ilustratif. Sekarang **33.912 POI bernama** dengan jarak & bearing great-circle asli, misalnya S-1013 (Depok):

- `Indomaret` — 76 m
- `Ruang P3/1B Lt.3` — 14 m
- `Terminal Type A Wonosari` — 517 m
- `Agen Bus Efisiensi Ambarketawang` — 165 m

Klien tinggal cari nama itu di Google Maps dari HP-nya.

### 2.4 Link verifikasi Google Maps (bukan data Google)

Setiap situs punya tombol `Open in Google Maps ↗` yang membuka `google.com/maps/search/cafe/@lat,lon,16z`. **Kita hanya mengirim link, tidak menyimpan konten Google** — ini yang membuatnya patuh ToS.

---

## 3. Dua bug yang saya temukan dan perbaiki sendiri

Ini bagian yang membuat angkanya bisa dipercaya — keduanya ketemu saat verifikasi silang.

### Bug 1: 166.603 POI hilang karena `GROUP BY name, lat, lon`

Versi pertama pipeline mengelompokkan POI berdasarkan nama + koordinat. Beberapa POI berbeda berbagi ketiganya (gerai chain di dalam mal, kios bernama generik), sehingga tergabung jadi satu.

Bukti: `6.462.914` baris sumber → `6.296.311` grup. **Selisih 166.603 POI.**

Perbaikan: kunci pada `fsq_place_id` (unik, 6.462.914 = 6.462.914). Assertion ditambahkan supaya kalau ini terjadi lagi, build gagal keras.

### Bug 2: 3.805.666 POI dibuang karena tidak punya label

`unnest(fsq_category_labels)` membuang baris yang arraynya `NULL`. Ternyata **3.805.666 dari 6.462.914** POI (59%) tidak punya label kategori sama sekali.

Akibatnya "POI within 2 km" untuk S-0107 terbaca **48.708**, padahal sebenarnya **113.020** — kurang dari separuh.

Perbaikan: `LEFT JOIN LATERAL (SELECT unnest(...)) ON TRUE` sehingga POI tanpa label tetap terhitung sebagai konteks.

**Pelajaran:** dua bug ini tidak akan pernah ketemu kalau saya cuma percaya output pipeline sendiri. Ketemu karena membandingkan dengan query independen yang ditulis terpisah.

---

## 4. Catatan teknis

### OOM pada box 3 GB
Join 64 juta baris untuk pin membuat proses di-kill OOM (RAM 3 GB). Solusi: **chunking 40 situs per batch** dengan `memory_limit='1800MB'`. Hasilnya 154 detik untuk 1.713 situs, memory datar, dan resumable (setiap batch flush ke CSV).

### Sumber data
- **Foursquare Open Source Places 2025-02-06** — Apache-2.0, boleh disimpan & didistribusikan komersial.
- 8.569.880 POI Indonesia; extract Jawa–Bali 6.462.914 baris / 204 MB.
- Query langsung dari `data.source.coop` via DuckDB httpfs (81 file parquet).
- Pencocokan kategori pada **segmen label terakhir** untuk menghindari jebakan substring (`Supermarket` ⊃ `Market`, `Parking` ⊃ `Park`).

### Yang TIDAK dipakai, dan kenapa
- **Bard-API (dsdanielpark/Bard-API)** — repo `archived: true`, push terakhir 2024-04. Endpoint butuh cookie sesi Google pribadi, mengembalikan teks (bukan database POI yang bisa di-query), dan melanggar ToS Google yang sama. Sudah saya uji langsung: `POST gemini.google.com/_/BardChatUi/...` → HTTP 400 tanpa cookie.
- **Scraping Google Maps** — ToS melarang persis dua hal yang dibutuhkan model ini: *"use Places latitude and longitude values as input for point-in-polygon analysis"* dan cache lat/lng > 30 hari.

---

## 5. Sisa pekerjaan (jujur)

| # | Item | Dampak | Status |
|---|---|---|---|
| 1 | 195 situs `Excluded — additional criteria` kena aturan 500 m pada worship/medical | 11,4% dataset; PP 28/2024 Pasal 449(1)d hanya menulis satuan pendidikan + tempat bermain anak | **Belum** — perlu pisah per instrumen (statutory vs Perda KTR) |
| 2 | Road proxy masih kelas OSM (trunk 20 → residential 5) | 20/45 poin (44%) skor bertumpu pada proksi | Sudah dilabeli "proxy" di UI, tapi belum divalidasi |
| 3 | 35 situs `coverage_unknown` | Skor & rank-nya masih tampil | Sudah ditandai `provisional` |
| 4 | Nama POI dari FSQ ada noise | `Ruang Tamu` masuk campus, `Pusbiktek` masuk public building | Sudah diberi label "(unnamed stall)" untuk nama generik |

**Urutan yang saya sarankan:** #1 dulu (paling berdampak ke legalitas), lalu #2.

**Disclaimer:** FSQ adalah sumber ketiga independen, bukan kebenaran lapangan. Yang dibuktikan di sini bukan "FSQ benar", tapi **"0 itu bukan nol"** — dan itu cukup untuk membatalkan klaim zero yang lama. Survei lapangan tetap yang menentukan.

---

## 6. Bukti

Semua angka di atas berasal dari eksekusi nyata:

```
distinct places: 6.462.914        (25 s)
counted sites:   1.713            (482 s)
pins:            33.912           (154 s, chunked)
```

Verifikasi silang S-0107 (Kota Bandung):
- Query pipeline: `113.020` POI dalam 2 km
- Query independen (scan langsung, tanpa prefilter): `113.020`

Sama persis.

Artifact: `~/ooh-verifikasi/remeasure_consumer_2km.csv` (v1, 8.565 baris) — v2 tersedia via `/data/showcase.json` di situs live.
