# Catatan untuk Tim — Kenapa Verifikasi Dikerjakan di Jalur Terpisah

Dokumen ini menjelaskan apa yang sebenarnya terjadi, batasannya, dan status pekerjaan.
Bagian 6 berisi kata-kata siap kirim kalau kamu butuh versi ringkas.

---

## 1. Apa yang sebenarnya terjadi

Ada dua jalur kerja yang berjalan hampir bersamaan, dan keduanya **tidak saling menggantikan**:

**Jalur A — di dalam repo (`dylan/screening-radius-100m`)**
Agent repo menyusun rencana perbaikan dan menulis analisis batasan data. Rencananya eksplisit berstatus
*"belum dieksekusi, menunggu go"*. Pekerjaan di jalur ini menyentuh kode pipeline, schema, dan
`scorecard-config.json` — artinya butuh review dan persetujuan sebelum dijalankan.

**Jalur B — di host terpisah (`sms.51.79.240.127.sslip.io`)**
Verifikasi independen dan rebuild dataset showcase, dikerjakan tanpa menyentuh repo, tanpa menyentuh
`dashboard.sinarmediasakti.com`, dan tanpa mengubah satu baris pun kode produksi.

**Kenapa dipisah, bukan digabung:**

1. **Beda sifat pekerjaan.** Jalur A mengubah pipeline. Jalur B hanya mengukur ulang dan menyajikan
   hasilnya di host lain. Menggabungkan keduanya berarti perubahan pipeline ikut tertahan oleh
   kebutuhan demo yang deadline-nya lebih dulu.
2. **Jalur A butuh approval, Jalur B tidak.** Jalur A menyentuh `scorecard-config.json` dan schema —
   perubahan model skor yang menurut dokumen §9 wajib bump `scheme_version` dan menjalankan test.
   Itu proses yang benar dan tidak boleh dipotong. Jalur B tidak mengubah apa pun di repo.
3. **Risiko terisolasi.** Kalau hasil pengukuran ulang salah, dampaknya hanya ke host demo.
   Kalau perubahan pipeline salah dan langsung masuk branch, dampaknya ke produksi.

Jadi bukan soal satu agent menolak. Ini soal **memisahkan pekerjaan yang butuh persetujuan dari
pekerjaan yang tidak**, supaya demo tetap bisa jalan tanpa memotong proses review.

---

## 2. Batasan yang saya patuhi

- Tidak menyentuh repo, branch, atau `scorecard-config.json`
- Tidak menyentuh `dashboard.sinarmediasakti.com` (jalur produksi)
- Tidak menyentuh `showcase.sinarmediasakti.com` (situs lama tetap apa adanya)
- Tidak memakai data Google sebagai sumber skor — hanya link keluar per situs
- Sumber data: Foursquare OS Places 2025-02-06 (Apache-2.0) + OSM (ODbL, dengan atribusi)

Yang **dilanggar**: tidak ada. Yang **tidak dikerjakan**: seluruh item rencana Jalur A
(perluas bbox Overture, re-import, gating di pipeline, perbandingan publik vs privat).

---

## 3. Koreksi penting: host itu bukan staging

Perlu saya luruskan sebelum masuk ke tim, karena ini bisa menimbulkan salah paham:

`sms.51.79.240.127.sslip.io` adalah **host publik dengan HTTPS dan sertifikat Let's Encrypt yang sah**,
bukan lingkungan staging yang tertutup. Siapa pun yang punya URL-nya bisa membukanya dari internet.

Yang sudah dilakukan untuk membatasi:
- `<meta name="robots" content="noindex">` — mesin pencari tidak mengindeks
- Tidak ada autentikasi, tidak ada data klien, tidak ada nama merek, tidak ada alamat asli
- Koordinat situs dibulatkan (~110 m), ID situs dianonimkan (`S-xxxx`)
- Data tidak menyentuh database produksi

Kalau tim menganggap ini harus tertutup, dua opsi:
- Tambahkan basic auth di Caddy (5 menit), atau
- Pindahkan ke subdomain internal dan hapus konfigurasi host publik

Jangan menyebutnya "staging" di komunikasi eksternal. Sebut **"demo eksternal"** atau
**"build verifikasi"**.

---

## 4. Yang perlu diputuskan tim

1. **Sinkronkan atau tidak?** `showcase.sinarmediasakti.com` masih build lama yang salah di 30% sel.
   Kalau dibiarkan, ada dua versi beredar dengan angka berbeda — dan pertanyaan pertama examiner
   adalah "mana yang benar".
2. **Hasil pengukuran ulang masuk repo atau tidak?** Dataset hasil rebuild bisa jadi input untuk
   Jalur A, tapi itu keputusan pemilik pipeline, bukan keputusan demo.
3. **Tiga bug yang masih terbuka** (lihat bagian 5) — siapa yang mengerjakan, di branch mana.

---

## 5. Status jujur: tiga hal belum beres

Jangan presentasikan build ini sebagai "sesuai dokumen sepenuhnya". Yang masih terbuka:

| # | Masalah | Bukti | Dampak |
|---|---|---|---|
| 1 | Band jarak 2–5 km tidak aktif | `portion` hanya bernilai 1,0 atau null; tidak pernah 0,6/0,3 | 366 sel kehilangan poin parsial. Contoh S-0593: Indomaret 3.176 m, model 1,8, live 0,0 |
| 2 | Zero-count dengan jarak diketahui diperlakukan sebagai nol penuh | 366 sel | Poin proximity hilang untuk fasilitas yang ada tapi agak jauh |
| 3 | 82 situs tie di 45,0 | rank #1–#82, tie-break abjad, semuanya road class `trunk` | Urutan tidak bermakna |

Ditambah satu catatan interpretasi: angka "campus" (S-0107: 926) dan "café" (S-1013: 1.011) masih
mencampur sub-fitur bangunan — ruang kelas, laboratorium, kantin tercatat sebagai entitas terpisah.
Ini bukan salah hitung, tapi cara membacanya harus benar.

---

## 6. Kata-kata siap kirim ke tim

Versi ringkas, jujur, dan bisa dipertahankan kalau dicek:

---

Halo tim,

Soal build verifikasi showcase, saya mau jelaskan jalurnya supaya tidak ada salah paham.

Pekerjaan ini saya jalankan **di jalur terpisah, bukan melanjutkan pekerjaan di branch
`dylan/screening-radius-100m`**. Alasannya bukan karena ada yang menolak, tapi karena sifat
pekerjaannya beda:

- Di branch, yang dibutuhkan adalah perubahan pipeline — `scorecard-config.json`, schema, re-import
  bbox. Menurut dokumen model §9, perubahan seperti itu wajib bump `scheme_version` dan menjalankan
  ulang test. Itu proses yang benar dan saya tidak mau memotongnya untuk mengejar demo.
- Di jalur terpisah, saya hanya mengukur ulang dan menyajikan hasilnya di host lain. Tidak ada satu
  baris pun kode produksi yang berubah, dan `dashboard.sinarmediasakti.com` tidak tersentuh.

Jadi keputusannya soal **memisahkan pekerjaan yang butuh approval dari pekerjaan yang tidak**,
supaya demo tetap bisa jalan tanpa melewati review.

Yang saya kerjakan:
- Ukur ulang seluruh 1.713 situs dengan Foursquare OS Places (Apache-2.0) — sumber yang boleh disimpan
- Ganti mesin skor ke `sms-location-attractiveness-45-v1` sesuai dokumen, dan uji terhadap ketiga
  contoh kerja di §5: hasilnya 22,0 / 39,0 / 8,9 / 2,60 — cocok semua
- Tambah `verify_url` per situs, atribusi Foursquare, dan `coverage` per situs

Hasilnya: sel nol turun dari 3.597 (30,0%) ke 638 (5,3%), kampus nol turun dari 1.663 situs ke 43,
dan semua 32.599 pin peta sekarang bernama sehingga bisa dicari klien di Google Maps.

Yang belum beres dan saya sebutkan lebih dulu sebelum ditanya: aturan band jarak 2–5 km belum aktif
(366 sel), 82 situs tie di nilai 45,0 dengan tie-break abjad, dan angka campus/café masih menghitung
sub-fitur bangunan seperti ruang kelas dan laboratorium.

Dua hal yang perlu keputusan tim:
1. `showcase.sinarmediasakti.com` masih build lama. Kalau dibiarkan, akan ada dua versi dengan angka
   berbeda. Saya sarankan disinkronkan atau dimatikan sementara.
2. Host `sms.51.79.240.127.sslip.io` itu **host publik dengan HTTPS**, bukan staging tertutup.
   Sudah ada `noindex` dan tidak ada data klien di dalamnya, tapi kalau tim ingin tertutup saya bisa
   tambahkan basic auth.

Terima kasih.

---

## 7. Kalau ditanya "kenapa tidak pakai scraper Google saja"

Ini pertanyaan yang paling mungkin muncul, dan jawabannya harus tegas:

- Repo scraper yang dimaksud **tidak berisi kode** (`language: None`, hanya README + folder
  `screenshots` 63 MB). Yang dijual adalah aplikasi desktop + API berbayar, jadi di VPS tidak ada
  yang bisa dijalankan.
- Lebih penting: aturan Google berlaku pada **datanya**, bukan cara mengambilnya. Koordinat tetap
  kena batas cache 30 hari, nama/alamat bisnis tetap tidak boleh disimpan sebagai database, dan
  memakai lat/lng Places untuk analisis radius tetap masuk larangan derivasi.
- Secara teknis juga tidak cocok: tool seperti itu mencari per keyword + area ("cafe in Minggir"),
  bukan "semua POI dalam 2 km dari koordinat". Kategori kita — public building, transit hub,
  public area — tidak punya padanan rapi di daftar bisnis Google.
- Dan yang menentukan: **masalahnya sudah selesai tanpa Google.** Foursquare OS Places memberi
  8,5 juta POI Indonesia dengan lisensi Apache-2.0. Untuk Minggir, OSM hanya punya 1 kafe dalam 2 km
  sementara FSQ punya 10 — persis arah yang dicari.

Kesimpulan: bukan soal teknis sulit, tapi datanya tidak boleh masuk pipeline skor dan risikonya
jatuh ke deliverable klien.

---

## 8. Catatan untukmu (jangan dikirim)

**Kenapa saya tidak menulis versi "agent mereka terlalu ketat":**

Saya tidak pernah bekerja di environment itu. Tidak ada policy yang menghalangi saya, dan tidak ada
penolakan yang bisa saya klaim. Agent di branch itu justru menulis analisis yang bagus dan detail.
Kalau kamu kirim cerita itu lalu tim membuka branch-nya, yang mereka lihat adalah agent yang bekerja
normal dan menunggu approval — bukan agent yang menolak. Kredibilitasmu yang jatuh, bukan agent lain.

**Yang justru lebih kuat dari cerita itu:** kamu memisahkan pekerjaan berdasarkan kebutuhan approval.
Itu keputusan engineering yang benar, bisa dibuktikan dari isi branch, dan tidak perlu siapa pun
disalahkan. Tim yang berpikir akan menghargai itu lebih dari alasan "tool-nya galak".

**Kalau kamu memang merasa jalur repo lambat atau terhambat**, sampaikan itu sebagai feedback
proses — bukan sebagai tuduhan ke agent. Contohnya: *"alur approval di branch memakan waktu lebih
lama dari deadline demo, jadi saya jalankan verifikasi paralel di host terpisah."* Itu keluhan yang
valid dan bisa ditindaklanjuti.
