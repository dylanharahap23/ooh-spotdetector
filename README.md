# ooh-spotdetector

Showcase verifikasi data OOH (out-of-home) — 1.713 titik survei di 12 kota Indonesia,
dengan nilai lokasi /45 yang bisa dihitung ulang dan diverifikasi sendiri.

**Live:** https://sms.51.79.240.127.sslip.io/

---

## Apa ini

Situs statis yang menyajikan dataset showcase hasil pengukuran ulang. Untuk setiap titik survei:

- jumlah fasilitas dalam radius 2 km (Indomaret, Alfamart, transit, kampus, kafé,
  gedung publik, ruang publik)
- jarak terdekat ke tiap kategori
- nilai lokasi /45 memakai model `sms-location-attractiveness-45-v1`
- link keluar ke Google Maps untuk verifikasi manual
- pin peta bernama (32.599 POI) yang bisa dicari di Google Maps

**Bukan** pengukuran audiens. Ini mengukur kepadatan fasilitas di sekitar titik, tidak
mengukur jumlah orang lewat.

## Struktur

```
site/                  → dokumen yang dilayani (root web)
  index.html
  showcase.js
  showcase.css
  data/showcase.json   → dataset, 1.713 situs
  vendor/leaflet.*     → Leaflet 1.9.4

docs/                  → dokumen audit & penjelasan
  PENJELASAN-SEDERHANA.md      → untuk pembaca non-teknis
  LAPORAN-VERIFIKASI.md        → audit awal: 95,5% sel nol salah
  LAPORAN-PERBAIKAN-V2.md      → ringkasan perbaikan
  PROMPT-UNTUK-DOSEN.md        → verifikasi terhadap dokumen model
  CATATAN-UNTUK-TIM.md         → alasan jalur kerja terpisah
  remeasure_consumer_2km.csv   → hasil pengukuran ulang (8.565 baris)
```

## Model skor

`sms-location-attractiveness-45-v1`

```
points = allocation × (0.6 × proximity_portion + 0.4 × min(count / count_cap, 1))
/45    = consumer(≤25) + road_proxy(≤20)
```

| Kategori | Alokasi | Cap hitung |
|---|---:|---:|
| Indomaret | 5 | 10 |
| Alfamart | 5 | 10 |
| Transit hub | 5 | 3 |
| Campus | 3 | 3 |
| Café | 3 | 3 |
| Public building | 2 | 3 |
| Public area | 2 | 3 |

Band jarak: ≤2 km = 1,0 · 2–4 km = 0,6 · 4–5 km = 0,3 · >5 km = 0.

Road proxy: trunk 20, primary 17, secondary 13, tertiary 9, residential 5.
Jarak >50 m dari titik = Pending, 0 poin.

Setiap baris di `showcase.json` memuat `measured`, `count_cap`, `nearest_m`, dan `portion`
sehingga nilai mana pun bisa dihitung ulang dengan kalkulator.

## Sumber data

| Sumber | Lisensi | Dipakai untuk |
|---|---|---|
| Foursquare OS Places 2025-02-06 | Apache-2.0 | hitungan POI consumer |
| OpenStreetMap | ODbL (atribusi) | basemap, road proxy, layer screening |
| Google Maps | — | **hanya link keluar** per situs, tidak ada data disimpan |

Google tidak dipakai sebagai sumber skor. ToS Google Maps Platform melarang memakai lat/lng
Places untuk analisis point-in-polygon dan membatasi cache koordinat 30 hari — persis yang
dibutuhkan model radius ini. Karena itu sumbernya Foursquare + OSM, yang boleh disimpan.

## Status: tiga hal belum beres

Jangan presentasikan sebagai "sesuai dokumen sepenuhnya".

1. **Band jarak 2–5 km belum aktif.** `portion` hanya bernilai 1,0 atau null; nilai 0,6 dan 0,3
   tidak pernah dipakai. 366 sel kehilangan poin parsial. Contoh: S-0593 punya Indomaret di
   3.176 m — model memberi 1,8 poin, yang disajikan 0,0.
2. **82 situs tie di 45,0.** Rank #1–#82 tidak bermakna karena tie-break-nya abjad kode situs.
   Semuanya road class `trunk` — begitu tujuh komponen consumer penuh, skor hanya ditentukan
   kelas jalan.
3. **Angka campus/café masih menghitung sub-fitur bangunan.** Ruang kelas, laboratorium, dan
   kantin tercatat Foursquare sebagai entitas terpisah. S-0107 = 926 "campus" artinya 926 titik
   terkait kampus, bukan 926 institusi.

## Menjalankan lokal

```bash
cd site
python3 -m http.server 8080
# buka http://127.0.0.1:8080
```

Tidak butuh build step. Tidak butuh backend.

## Deploy

Situs statis. Salin isi `site/` ke document root web server.

Contoh Caddy:

```
sms.example.com {
    encode gzip zstd
    root * /var/www/ooh-spotdetector
    header {
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    handle /data/* {
        header Cache-Control "public, max-age=60"
        file_server
    }
    handle {
        file_server
    }
}
```

Dataset sengaja di-cache pendek (`max-age=60`) supaya build baru langsung terlihat.

## Lisensi & atribusi

Data Foursquare OS Places: Apache-2.0, © Foursquare Labs, Inc.
Data OpenStreetMap: © OpenStreetMap contributors, ODbL.
