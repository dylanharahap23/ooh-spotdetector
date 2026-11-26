# Verifikasi Independen — Showcase OOH Sinarmediasakti

Tanggal verifikasi: 2026-11-24
Objek: https://showcase.sinarmediasakti.com/ (`data/showcase.json`, 1.713 situs, 12 kota)
Sumber pembanding: **Foursquare Open Source Places 2025-02-06** (Apache-2.0, boleh disimpan) — 8.569.880 POI Indonesia, dipotong Jawa–Bali (6.462.914 baris)
Metode: jarak great-circle (haversine) 2.000 m dari setiap koordinat situs, kategori dicocokkan pada segmen label terakhir (menghindari jebakan substring seperti `Supermarket` ⊃ `Market`)

---

## 1. Yang saya konfirmasi benar dari brief

| Klaim brief | Status | Bukti |
|---|---|---|
| 1.713 observasi, 12 kota | ✅ | `sites.length = 1713`, `cityList = 12` |
| 145 Pass / 1.568 excluded @500 m | ✅ | `status` = 145 / 1373 / 195 |
| 1.293 Pass / 420 excluded @100 m | ✅ | `passByRadius` = 1293 / 145 |
| Aturan = edu + worship + medical ≤ 500 m | ✅ | rekonstruksi ulang: **agreement 1713/1713 = 100%** |
| Rank #1–#1.713 ikut skor | ✅ | `rank` monoton terhadap `score.total` |
| Label "modelled" sudah ada di UI | ✅ | `showcase.js:273` "Modelled, not measured" |
| S-1082: OSM 2 km berisi 7 kafe | ✅ | Overpass (base 2026-11-24T15:14Z): 7 café, 2 bus_station, 2 community_centre |
| S-1088: OSM 2 km = 1 kafe | ✅ | Overpass: 1 café, 1 community_centre |
| Bard-API repo tanpa kode inti | ✅ | repo `archived: true`, push terakhir 2024-04-24, hanya wrapper cookie |
| Google ToS: larangan point-in-polygon + cache 30 hari | ✅ | developers.google.com/maps/documentation/geocoding/policies |

Brief itu jujur. Tapi **skala masalahnya jauh lebih besar dari yang brief tulis.**

---

## 2. Temuan yang mengubah kesimpulan

Brief menulis: *"504 dari 1.713 situs seluruh disc 2 km-nya di luar bbox"* → dibaca sebagai masalah tepi (edge case).

Hasil pengukuran ulang independen:

> **3.363 dari 3.521 sel "scored_zero" (95,5%) salah.** Data POI-nya ada, sistem menulis 0.
> **1.631 dari 1.713 situs (95%)** punya minimal satu sel yang salah.

Bukan masalah tepi bbox. Ini kegagalan import consumer layer.

| Kategori | sel "scored_zero" | FSQ > 0 | % salah |
|---|---|---|---|
| Café | 352 | 352 | **100,0%** |
| Campus | 1.624 | 1.612 | **99,3%** |
| Public building | 358 | 353 | 98,6% |
| Public area | 453 | 435 | 96,0% |
| Transit hub | 734 | 611 | 83,2% |

Median jumlah POI di sel yang dilaporkan "0" adalah **98 POI dalam radius 2 km**; p90 = **1.414 POI**.

### Bukti per kota — ini yang membongkar teori bbox

| Kota | situs | semua-5-kategori-nol | % |
|---|---|---|---|
| Kota Malang | 94 | 80 | **85%** |
| Kota Surabaya | 241 | 176 | **73%** |
| Kota Semarang | 202 | 39 | 19% |
| Kab. Sleman | 183 | 17 | 9% |
| Kab. Bogor | 243 | 19 | 8% |
| Kota Bandung | 209 | 16 | 8% |
| Tangsel / Tangerang / Bekasi / Bantul / Badung / Yogyakarta | 481 | 0 | **0%** |

Kalau penyebabnya bbox yang berhenti di 110,4651 BT (Sleman), kota lain tidak mungkin 0%. Malang 85% dan Surabaya 73% sementara Tangsel 0% → **consumer layer dua kota itu praktis tidak pernah ter-import.** Di Malang tetap ada 2.857 POI per 2 km di FSQ. Ini bukan artefak tepi, ini layer kosong.

### Konsistensi internal: skor bertabrakan dengan UI-nya sendiri

Di situs yang sama, `showcase.json` menampilkan pin café di 200 m **sekaligus** menulis "Café 0.0 · none inside 2 km".

Contoh S-0071 (Antapani, Bandung, rank #1233):

| Kategori | showcase | FSQ 2 km | Contoh nama |
|---|---|---|---|
| Café | 0.0 — none inside 2 km | **380** | Mint Bottle Coffee, Candy fresh milk |
| Campus | 0.0 — none inside 2 km | **623** | Kantor Yayasan Univ Widyatama |
| Public building | 0.0 — none inside 2 km | **113** | Pusbiktek Kementrian PU |
| Public area | 0.0 — none inside 2 km | **74** | Taman Menteng |

Eksaminer akan menemukan ini dalam 5 menit dengan klik satu titik. Bukan "under-reported" — ini kontradiksi di layar yang sama.

### Dampak ke 145 situs Pass

- 112 dari 145 situs Pass punya minimal satu sel `scored_zero` yang salah.
- Campus salah di **91** situs Pass, Transit di **43**, Public area di **16**, Public building di **2**.
- Artinya 77% situs yang lulus screening punya skor under-reported → **urutan rank di dalam daftar Pass tidak bisa dipertahankan.**

Catatan: café justru 0 salah di antara 145 situs Pass — konsisten dengan brief bahwa situs Pass berada di area yang ter-cover. Tapi kategorinya bukan hanya café.

---

## 3. Soal Google Maps / reverse engineering — jawabannya tidak

### 3.1 Bard-API (dsdanielpark/Bard-API) — sudah saya uji, tidak bisa dipakai

```
repo        : archived: true, push terakhir 2024-04-24
bard.google.com    → 301 → gemini.google.com
endpoint    : POST gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate
tanpa cookie auth  → HTTP 400  ")]}'  100 [[…400…]]"
```

Tiga alasan mati, berurutan:

1. **Butuh cookie sesi Google pribadi.** Bukan API key. Setiap request = akun Google nyata yang login; umur cookie jam-an, dan kalau dipakai untuk 1.713 situs × 5 kategori, akunnya di-flag dalam hitungan menit.
2. **Yang dikembalikan teks, bukan database POI.** Anda tidak bisa menghitung "berapa kafe dalam 2 km" secara deterministik dari chatbot. Bahkan kalau jalan, hasilnya berubah tiap run → **tidak bisa diaudit.** Untuk presentasi ke klien, sumber yang tidak reproducible adalah risiko terburuk: satu pertanyaan "coba ulang, kok beda?" dan kredibilitasnya habis.
3. **Melanggar ToS Google yang sama.** Yang brief tulis soal larangan scraping berlaku juga untuk scraping Gemini. Jadi Anda menukar masalah lisensi dengan masalah lisensi + masalah reliabilitas.

### 3.2 "Reverse engineer Google Maps" untuk skor — tidak perlu, dan tidak boleh

ToS Google Maps Platform (dicek langsung hari ini) melarang persis dua hal yang model ini lakukan:
- **"use Places latitude and longitude values as input for point-in-polygon analysis"** — itu literally radius/containment check kita.
- Cache lat/lng dari Places API maksimum **30 hari**, wajib dihapus.
- Place ID boleh disimpan permanen; nama/alamat bisnis tidak.

Jadi data Google **tidak bisa** jadi basis skor yang disimpan dan dipresentasikan sebagai database — bukan soal teknis, soal lisensi. Kalau klien menanyakan sumber data, jawaban "kami scrape Google" adalah jawaban yang membuat proyeknya gugur.

### 3.3 Yang saya pakai sebagai gantinya — dan sudah terbukti jalan

**Foursquare Open Source Places** — 104 juta POI global, lisensi **Apache-2.0** (boleh disimpan, dimodifikasi, didistribusikan, termasuk komersial). Tersedia sebagai GeoParquet terpartisi, bisa di-query langsung dengan DuckDB tanpa download penuh:

```
s3://fused/fsq-os-places/2025-02-06/places/   (81 file parquet)
→ 8.569.880 POI Indonesia, extract Jawa–Bali 6.462.914 baris, 204 MB
→ 1.713 situs × 2 km diukur dalam ~4 menit
```

Ini menjawab keberatan brief ("dinamai tidak ada datanya") **dan** keberatan lisensi sekaligus. FSQ jauh lebih padat dari OSM di pinggiran: Minggir yang OSM-nya cuma 1 kafe, di FSQ ada 10 kafe + 9 government building + 8 public area dalam 2 km — persis arah yang brief bilang "Google ~5". Jadi bukan perlu Google; perlu sumber yang benar.

---

## 4. Penilaian rencana perbaikan

| # | Rencana brief | Verdict | Koreksi |
|---|---|---|---|
| 1 | Perluas bbox consumer 12 kota + re-import Overture/OSM | ⚠️ **Arah benar, diagnosis salah** | Bukan bbox yang sempit. Malang 85% & Surabaya 73% nol sementara Tangsel 0% → dua kota itu layer consumer-nya **tidak pernah masuk**. Perbaiki pipeline import + tambah **assertion coverage per kota** (gagal keras kalau satu kota < 90% terisi), bukan cuma melebarkan kotak. |
| 2 | Gating per-situs: di luar/partial → Pending, "coverage unknown" | ✅ **Wajib, dan prioritas #1** | Tambah state ke-3 di skema: `scored` / `scored_zero` / `coverage_unknown`. Sekarang `scored_zero` dipakai untuk dua arti berbeda — itu akar masalahnya. 3.363 sel harus pindah ke `coverage_unknown`. |
| 3 | Label "modelled / provisional" pada skor & rank | ✅ **Setuju** | Tapi `provisional` sekarang tidak menangkap apa-apa: **337 dari 347** situs yang kelima kategori consumer-nya nol justru `provisional: false`. Flag-nya salah hitung. Perbaiki dulu, baru tampilkan. |
| 4 | Google Maps hanya bukti verifikasi manual per situs | ✅ **Setuju** | Boleh, sebagai deep-link "lihat di Google Maps" — **jangan** simpan koordinat/nama hasil Google ke DB. Link, bukan data. |
| 5 | Bandingkan skor publik vs model privat untuk 145 Pass + 10 partial | ✅ **Bagus, tapi jangan berhenti di situ** | 112 dari 145 situs Pass terdampak, bukan 10. Bandingkan **semua 1.713**, dan publikasikan angka agreement-nya. |

**Yang belum ada di rencana tapi harus ada:**

6. **Perbaiki aturan 500 m — 195 situs ter-exclude tanpa dasar.** `Excluded — additional criteria` (195) = situs yang lolos uji education tapi kena worship/medical ≤ 500 m. PP 28/2024 Pasal 449(1)d hanya menulis **satuan pendidikan dan tempat bermain anak**. Menerapkan 500 m ke masjid & faskes adalah over-claim — persis yang di peringatan skill: *"Applying 500 m to mosques and clinics as if the PP said so is an over-claim."* Ini 11,4% dari dataset, dan itu 195 situs yang mungkin sebenarnya lolos. Perlu dipisah per instrumen (statutory vs Perda KTR), jangan digabung jadi satu angka.
7. **Road proxy = kelas OSM, bukan fungsi jalan.** Sudah diakui brief, tapi 1.671 dari 1.713 situs `road_status: "estimated"` → skor /45-nya 20/45 (44%) bertumpu pada proksi yang belum divalidasi. Untuk presentasi, sebut sebagai **proksi**, dan jangan tampilkan sebagai "skor 24,2/45" tanpa embel-embel itu di baris yang sama.

---

## 5. Verdict untuk presentasi klien

**Boleh dipresentasikan (solid):**
- 1.713 observasi survei & status Pass/Fail **untuk 145 situs yang cakupan consumer-nya terverifikasi**.
- Metodologi jarak 500 m berbasis layer OSM bertanggal — reproducible, ada timestamp.
- Kejujuran soal "modelled, not measured" — ini justru nilai jual.

**JANGAN dipresentasikan sebagai fakta (hancur kalau di-klik):**
- Semua angka `0` pada 5 kategori consumer. **95,5% salah.** Ganti ke "coverage unknown" sebelum presentasi, bukan sesudah.
- Rank #1–#1.713 dan skor /45 untuk situs yang sel consumer-nya nol — termasuk S-1082 (#1447) dan S-1088 (#1683) yang disebut brief.
- Klaim "café terdekat 0 dalam 2 km" untuk 352 situs — FSQ menemukan kafe di **100%** kasus itu.

**Urutan eksekusi yang saya sarankan (jangan dibalik):**
1. Tambah state `coverage_unknown` + pindahkan 3.363 sel. (1–2 hari)
2. Perbaiki `provisional` flag (sekarang salah untuk 337 situs). (½ hari)
3. Re-import consumer Malang + Surabaya — 256 dari 347 situs all-zero ada di dua kota ini. (2–3 hari)
4. Pisahkan aturan 500 m per instrumen; review 195 situs "additional criteria". (1 hari)
5. Baru generate ulang skor, rank, dan CSV. Bandingkan publik vs privat untuk 1.713 situs.
6. Presentasi.

Langkah 1–2 saja sudah cukup membuat showcase-nya tidak bisa dibantah dengan satu klik. Langkah 3 yang membuat angkanya benar.

---

## 6. Artifact

- `~/ooh-verifikasi/remeasure_consumer_2km.csv` — 8.565 baris (1.713 situs × 5 kategori): `site_id, city, district, status_500m, rank, score_total, category, showcase_state, showcase_points, fsq_count_2km, verdict`
- Workspace: `~/.hermes/cache/scratch/` (`showcase.json`, `fsq_id_javabali.parquet`, `remeasure.py`)

**Disclaimer:** FSQ adalah sumber ketiga yang independen, bukan kebenaran lapangan. Angka FSQ bisa salah juga (ada `Pusbiktek` masuk public_building, `Ruang Tamu` masuk campus). Yang dibuktikan di sini bukan "FSQ benar", tapi **"0 itu bukan nol"** — dan itu cukup untuk membatalkan klaim zero-nya. Survei lapangan tetap yang menentukan.
