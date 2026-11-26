# Prompt untuk Dosen — Verifikasi Perbaikan Terhadap location-attractiveness-45-v1

> Cara pakai: kirim bagian di bawah garis sebagai satu pesan. Bahasa Indonesia formal.
> Jangan sebut "sempurna" — klaim yang bisa dipertahankan adalah "sesuai dokumen dan dapat diverifikasi ulang".

---

Selamat siang Pak/Bu,

Terima kasih atas dokumen `location-attractiveness-45-v1` dan atas koreksinya. Enam koreksi Bapak/Ibu saya terima dan sudah saya verifikasi ulang terhadap data yang dilayani; semuanya cocok. Saya juga sudah mengganti mesin skor di `sms.51.79.240.127.sslip.io` agar memakai model Bapak/Ibu, bukan kurva kalibrasi yang saya buat sendiri.

**Yang saya perbaiki, dengan angka sebelum dan sesudah**

| Temuan Bapak/Ibu | Sebelum | Sesudah |
|---|---|---|
| Campus menggelembung | S-1013: 1.337 "kampus" | **323**, karena 1.014 sisanya adalah `College Classroom`, `College Lab`, `College Academic Building`, dan `Student Center` — ruangan, bukan institusi |
| Pin melewati radius | 721 situs punya pin > 2.000 m, maksimum 2.999 m | **0 pin > 2.000 m**, maksimum tepat 2.000 m |
| Kurva skor bukan model resmi | `max × log(1+n)/log(1+saturation)` | **`allocation × (0,6 × portion + 0,4 × min(count/cap, 1))`**, model `sms-location-attractiveness-45-v1` |
| Angka 2.807 milik situs lain | dilaporkan sebagai S-1082 | S-1082 = **35 kafé**; 2.807 memang milik S-0107 dan sudah saya koreksi di laporan |
| Klaim "tidak ada komponen mentok cap" | salah | diakui salah; angka benar ada di tabel di bawah |
| Jumlah nilai skor berbeda | saya klaim 351 | **228** pada model v1 |

**Verifikasi terhadap contoh kerja di dokumen §5**

Saya implementasikan formula dari dokumen lalu menguji ketiga contoh yang Bapak/Ibu tulis:

| Contoh | Dokumen | Implementasi saya |
|---|---|---|
| A — Semarang, consumer | 22,00 | **22,00** |
| A — total (22,00 + road primary 8,2 m) | 39,00 | **39,00** |
| B — Bantul, consumer (band 0,6 dan 0,3) | 8,90 | **8,90** |
| B — road 91,2 m → Pending | 8,90 | **8,90** |
| Micro-example — 2 kafé @1.329 m | 2,60 | **2,60** |

Semua cocok. Implementasinya bisa dijalankan ulang dari berkas `model_v1.py` yang saya lampirkan; tidak ada konstanta yang tidak berasal dari dokumen.

**Uji pembanding independen yang Bapak/Ibu sarankan**

Saya jalankan persis uji itu — satu situs, satu kategori, hitung manual dari data mentah, lalu bandingkan dengan yang dilayani:

- Situs **S-0062** (Bandung, Kec. Andir), kategori `Campus`
- Query langsung ke Foursquare OS Places, filter 2 km, dedupe per `fsq_place_id`
- Hasil independen: **n = 63, jarak terdekat 180,8 m**
- Yang dilayani situs: **n = 63, jarak terdekat 180,8 m**
- **Cocok persis.**

**Tiga hal yang perlu saya klarifikasi, karena hasil pengukuran berbeda dari dugaan**

1. **Filter radius diterapkan, bukan bbox.** Untuk S-1013: bbox tanpa radius menghasilkan 95.784 baris; lingkaran ≤2.000 m menghasilkan 41.504; yang dilayani 41.504. Bbox akan 2,3× lebih besar.
2. **Tidak ada perkalian dari join label.** `count(DISTINCT fsq_place_id)` di dalam lingkaran = 41.504 = jumlah baris. Nol duplikasi. Saya sempat punya bug ini di versi pertama, tapi ketemu dan sudah diperbaiki sebelum deploy.
3. **Bucket kafé tidak mencampur restoran.** Untuk S-1013: bucket kafé = 1.011 (`Café` + `Coffee Shop` + `Coffee` + `Tea Room`), sedangkan 4.011 `Indonesian Restaurant`/`Asian Restaurant`/`Diner`/`Food Truck` berada di luar bucket.

**Akar masalah yang menurut saya belum tersentuh dokumen**

Kerapatan POI di Foursquare bukan artefak hitung. 14–19% POI berlabel adalah sub-fitur bangunan — ruang kelas, laboratorium, kantin, parkir, unit apartemen. Nama seperti *"Bawah Tangga Depan Sekretariat JPMIPA USD"* dan *"Basement 5 STMIK AMIKOM"* muncul sebagai entitas terpisah. Jadi untuk kampus, masalahnya bukan radius maupun dedupe, melainkan pemetaan taksonomi: institusi dan ruangannya diperlakukan setara.

**Keterbatasan yang saya akui terbuka**

Pada model v1, **77,2% komponen mencapai cap** dan **671 situs (39,2%)** memiliki ketujuh komponen penuh sekaligus, sehingga **82 situs** memperoleh tepat 45,0/45 dan pemeringkatannya ditentukan sepenuhnya oleh kelas jalan. Ini konsisten dengan §8 butir 5 dokumen ("most urban categories reach their cap with a handful of POIs"), jadi bukan penyimpangan implementasi — tetapi perlu saya sampaikan agar tidak mengejutkan saat diperiksa.

Saya juga belum menyentuh dua hal:
- 195 situs berstatus `Excluded — additional criteria` masih menerapkan ambang 500 m pada tempat ibadah dan fasilitas medis, padahal PP 28/2024 Pasal 449(1)d hanya menyebut satuan pendidikan dan tempat bermain anak. Ini perlu dipisah per instrumen.
- Road proxy masih memakai kelas OSM, bukan fungsi jalan resmi (Arteri/Kolektor/Lokal), dan belum divalidasi lapangan.

**Yang saya mohon diperiksa**

1. Apakah pemetaan taksonomi yang saya pakai sudah tepat? Saya memakai `College and University`, `University`, `Community College` untuk campus; `Transit Station`, `Bus Station`, `Train Station`, `Ferry Terminal`, `Light Rail Station`, `Metro Station` untuk transit; `Library`, `Community Center`, `Government Office`, `Government Building`, `Courthouse`, `Town Hall` untuk public building; `Park`, `Marketplace`, `Plaza`, `Public Plaza`, `Public Space` untuk public area.
2. Apakah `Government Building` sebaiknya dikeluarkan, karena dokumen hanya menyebut `government_office`?
3. Untuk 671 situs yang seluruh komponennya mentok cap — apakah Bapak/Ibu ingin cap dinaikkan, atau tie-break-nya dijelaskan eksplisit sebagai bagian model?

Situs live: `https://sms.51.79.240.127.sslip.io/` — setiap baris menampilkan `count`, `count_cap`, `nearest_m`, dan `portion` sehingga nilai mana pun bisa dihitung ulang dengan kalkulator.

Terima kasih.

---

## Catatan untuk kamu (jangan dikirim ke dosen)

**Kenapa prompt ini tidak memakai kata "sempurna":**

- Dosen sudah sekali menemukan bug nyata yang lolos dari saya. Klaim "sempurna" adalah taruhan yang tidak perlu.
- Kalimat "sesuai dokumen dan dapat diverifikasi ulang" lebih kuat karena bisa diuji, bukan diklaim.
- Prompt ini **secara proaktif menyebut** 77,2% cap dan 671 situs bernilai penuh. Kalau dia menemukannya sendiri setelah kamu klaim sempurna, itu fatal. Kalau kamu yang menyebut lebih dulu, itu namanya integritas.

**Tiga pertanyaan di akhir sengaja diserahkan ke dia** — itu memindahkan percakapan dari "apakah kamu benar" menjadi "bagaimana sebaiknya model ini". Posisi yang jauh lebih aman untuk presentasi.

**Sebelum kirim, pastikan:**
- `model_v1.py` benar-benar dilampirkan (dia akan menjalankannya)
- `https://sms.51.79.240.127.sslip.io/` masih hidup
- Kamu sudah buka sendiri satu situs dan cocokkan angkanya dengan Google Maps di HP — kalau ada satu saja yang meleset, jangan kirim dulu

**Kalau dia bertanya soal `showcase.sinarmediasakti.com`:** jawab jujur bahwa itu masih build lama dan belum disinkronkan. Jangan bilang sudah — dia akan mengecek.
