# Penjelasan Sederhana — Situs Showcase OOH

Ditulis untuk pembaca non-teknis. Tidak perlu tahu apa itu API, database, atau POI.

---

## 1. Situs ini sebenarnya ngapain?

Bayangkan kamu mau pasang billboard. Pertanyaan pertama yang wajar: **"di lokasi ini ada apa saja di sekitarnya?"**

Situs ini menjawab pertanyaan itu untuk **1.713 titik survei** di 12 kota. Untuk setiap titik, dia menghitung:

- berapa minimarket (Indomaret/Alfamart) dalam radius 2 km
- berapa halte/terminal
- berapa kampus
- berapa kafe
- berapa gedung publik (kantor pemerintah, perpustakaan)
- berapa ruang publik (taman, pasar, alun-alun)

Lalu dari situ dihitung **nilai lokasi 0–45**. Makin banyak fasilitas di sekitar, makin tinggi nilainya.

**Penting:** ini mengukur *"ramai karena ada apa di sekitarnya"*, bukan *"berapa orang lewat"*. Jumlah orang lewat tidak diukur. Kalau klien tanya soal traffic, jawabannya harus jujur: belum diukur.

---

## 2. Kenapa ada dua versi situs?

Ada dua alamat:

| Alamat | Status |
|---|---|
| `showcase.sinarmediasakti.com` | **Versi lama** — dibuat 23 Nov. Jangan dipakai presentasi. |
| `sms.51.79.240.127.sslip.io` | **Versi baru** — dibuat 24 Nov, sudah diperbaiki. Pakai yang ini. |

Kenapa versi lama jangan dipakai? Karena **hampir semua titik bilang "kampus 0"**. Faktanya di Yogyakarta dan Bandung itu mustahil — di sana ada ratusan kampus. Itu bug, bukan temuan.

---

## 3. Apa yang berubah — pakai bahasa sehari-hari

### a. Data jadi jauh lebih lengkap

| | Versi lama | Versi baru |
|---|---|---|
| Sel yang bilang "0" padahal salah | **3.597** (30% dari semua) | **638** (5,3%) |
| Titik yang bilang "kampus 0" | 1.663 dari 1.713 | 43 dari 1.713 |
| Titik yang semua kategorinya nol | 3 | **0** |

Analogi: versi lama itu seperti sensus yang **tidak mendatangi 30% rumah** lalu menulis "tidak ada penghuni". Versi baru mendatangi semua rumah.

### b. Angkanya sekarang bisa dicek ulang

Versi lama cuma bilang *"Campus: 0,0 dari 3"*. Titik. Tidak ada penjelasan.

Versi baru bilang:

> Campus: 3,00 dari 3 — **323 kampus terukur**, batas nilai 3, **terdekat 30 m**

Jadi kalau ada yang tidak percaya, dia bisa hitung sendiri pakai kalkulator. Itu yang membedakan laporan biasa dengan laporan yang bisa diaudit.

### c. Setiap titik punya tombol "Open in Google Maps"

Klien buka dari HP, tekan tombolnya, langsung lihat lokasi itu di Google Maps. **Bandingkan sendiri.** Tidak perlu percaya kata kita.

Ini juga aman secara hukum: kita cuma mengirim **link**, bukan menyalin data Google. Menyalin data Google untuk scoring itu melanggar aturan mereka; mengirim link tidak.

### d. Titik-titik di peta sekarang punya nama asli

Versi lama: titik-titik di peta tidak punya nama. Cuma "ada sesuatu di 200 meter arah tenggara".

Versi baru: **32.599 titik, semuanya bernama**. Contoh: *"KRD Ekonomi Bandung Raya Padalarang – Cicalengka"*, *"Indomaret"*, *"Terminal Type A Wonosari"*.

Klien tinggal cari nama itu di Google Maps. Kalau ketemu, berarti kita benar.

### e. Ada tanda "belum terverifikasi" yang jujur

Versi baru punya label untuk data yang belum yakin. Kalau datanya tipis, situs bilang **"coverage unknown"** — bukan pura-pura nol.

Prinsipnya: **"tidak ada data" itu beda dengan "memang nol"**. Versi lama mencampur keduanya. Itu kesalahan paling berbahaya di laporan survei.

---

## 4. Contoh nyata — dua titik yang dulu salah

**S-1082 (Kalasan, Sleman)**
- Versi lama: nilai 24,2 — kafe 0, kampus 0
- Versi baru: nilai **38,8** — **35 kafe**, **7 kampus** dalam 2 km
- Kenyataan: di sekitar Prambanan memang banyak kafe. Yang lama salah.

**S-1088 (Minggir, Sleman)**
- Versi lama: nilai 14,8 — kafe 0, kampus 0
- Versi baru: nilai **18,0** — **10 kafe**, **0 kampus**
- Kenyataan: Minggir itu pinggiran, jadi kafe sedikit dan memang tidak ada kampus terdekat. Di sini angka 0-nya **benar** — dan itu justru bukti sistemnya bekerja, bukan asal isi.

---

## 5. Yang masih belum beres — jujur, tiga hal

Kalau klien atau dosen tanya "sudah sempurna?", jawabannya **belum**. Tiga hal ini masih terbuka:

### a. Jarak 2–5 km belum dihitung

Model nilai punya aturan: kalau fasilitasnya ada di 2–4 km, dapat nilai sebagian (60%). Kalau 4–5 km, dapat 30%.

Sekarang aturan itu **belum jalan**. Contoh: S-0593 punya Indomaret di 3.176 m. Harusnya dapat 1,8 poin. Yang keluar 0,0.

Dalam bahasa sederhana: *"kalau Indomaret-nya agak jauh, sekarang dianggap tidak ada. Padahal model bilang harus dapat nilai sebagian."*

Ada **366 sel** yang kena masalah ini.

### b. 82 lokasi nilainya sama-sama sempurna

82 lokasi dapat nilai tepat **45,0 dari 45** — nilai maksimal. Jadi waktu diurutkan, tidak ada dasar untuk bilang mana yang nomor 1 dan mana nomor 82.

Sekarang urutannya jatuh ke **abjad kode situs**. Itu tidak ada artinya.

Analogi: 82 siswa dapat nilai 100. Kalau ranking-nya diurutkan berdasarkan abjad nama, itu bukan ranking yang berguna.

**Catatan penting:** ini bukan bug hitung. Modelnya memang memberi nilai penuh kalau semua kategori sudah mentok batas. Tapi cara mengurutkan yang seri harus dijelaskan, bukan dibiarkan abjad.

### c. Kampus dan kafe masih kelebihan hitung

Di dalam satu kampus ada banyak ruangan: ruang kelas, laboratorium, kantin, gedung fakultas. Foursquare mencatat **semuanya sebagai entitas terpisah**.

Contoh nyata dari data: *"Bawah Tangga Depan Sekretariat JPMIPA USD"* dan *"Basement 5 STMIK AMIKOM"* dihitung sebagai "kampus".

Hasilnya S-0107 tercatat **926 kampus** dalam 2 km. Kampus se-Bandung tidak sebanyak itu.

Jadi angka 926 itu **bukan salah hitung** — itu memang isi datanya. Tapi cara membacanya harus benar: ini *"926 titik yang berhubungan dengan kampus"*, bukan *"926 kampus"*.

---

## 6. Kalimat yang aman diucapkan ke klien

Gunakan ini:

> "Setiap titik di sini punya angka yang bisa Bapak/Ibu hitung sendiri. Kami tampilkan jumlah fasilitasnya, batas nilainya, dan jarak terdekatnya. Kalau mau dibandingkan dengan Google Maps, ada tombolnya di setiap titik — silakan cek langsung dari HP."

> "Yang kami ukur adalah **kepadatan fasilitas di sekitar lokasi**, bukan jumlah orang lewat. Untuk traffic, itu pengukuran terpisah yang belum kami lakukan."

> "Kami sengaja menandai data yang belum yakin. Kalau di suatu titik datanya tipis, kami tulis 'coverage unknown' — bukan kami tulis nol. Karena 'tidak ada data' dan 'memang nol' itu dua hal berbeda."

Kalimat-kalimat ini kuat karena **bisa diuji**. Klien yang mengecek akan menemukan kita benar.

---

## 7. Kalimat yang JANGAN diucapkan

❌ *"Datanya sudah sempurna."*
→ Belum. Ada tiga hal di bagian 5.

❌ *"Ini data Google Maps."*
→ Bukan. Sumbernya Foursquare dan OpenStreetMap, keduanya boleh dipakai dan disimpan. Google cuma dipakai sebagai link pembanding. Kalau bilang "data Google", itu bohong **dan** melanggar aturan Google.

❌ *"S-0107 ada 926 kampus."*
→ Salah baca. Yang benar: *"926 titik terkait kampus"* — termasuk ruang kelas dan laboratorium di dalam gedung yang sama.

❌ *"Ini mengukur berapa orang yang bakal lihat billboard."*
→ Bukan. Ini mengukur fasilitas di sekitar. Jumlah penonton tidak diukur.

❌ *"Versi lama dan baru sama saja, cuma beda tampilan."*
→ Beda jauh. Versi lama salah di 30% data.

---

## 8. Kamus istilah

| Istilah | Arti sederhana |
|---|---|
| **POI** | *Point of Interest* — tempat yang orang datangi: kafe, minimarket, kampus, halte |
| **Radius 2 km** | Lingkaran 2 km dari titik billboard. Semua yang dihitung harus di dalam lingkaran ini |
| **Nilai /45** | Nilai lokasi, maksimal 45. Terdiri dari 25 poin "fasilitas sekitar" + 20 poin "kelas jalan" |
| **Kelas jalan (road proxy)** | Perkiraan ramai-tidaknya jalan dari jenisnya: jalan utama > jalan kecil. Ini **perkiraan**, bukan hitungan mobil |
| **coverage unknown** | "Kami belum punya data di sini" — beda dengan "memang tidak ada" |
| **provisional** | Nilai sementara, masih ada komponen yang belum pasti |
| **band** | Aturan jarak: ≤2 km dapat penuh, 2–4 km dapat 60%, 4–5 km dapat 30% |
| **tie-break** | Cara menentukan urutan kalau nilainya sama |

---

## 9. Ringkasan satu paragraf

> Versi baru jauh lebih layak diperiksa: data jauh lebih lengkap (salah-nol turun dari 30% ke 5,3%), setiap angka bisa dihitung ulang, setiap titik punya nama asli yang bisa dicari di Google Maps, dan ada tanda jujur untuk data yang belum pasti. Tapi belum boleh disebut "sesuai model sepenuhnya" sampai tiga hal diperbaiki: aturan jarak 2–5 km, cara mengurutkan 82 lokasi bernilai sama, dan cara membaca angka kampus yang masih menghitung ruangan. Untuk presentasi, pakai versi baru, sebutkan ketiga batasan itu lebih dulu, dan biarkan klien mengecek sendiri lewat tombol Google Maps.

---

## 10. Untuk kamu (jangan dikirim ke klien)

**Kenapa dokumen ini menyebut kekurangan sendiri:** kalau kamu sembunyikan tiga bug itu lalu dosen/klien menemukannya, kamu kehilangan kredibilitas dua kali — sekali karena bugnya, sekali karena menyembunyikan. Kalau kamu yang menyebut duluan, itu namanya transparansi, dan posisimu jauh lebih kuat.

**Sebelum presentasi, lakukan ini:**
1. Buka `sms.51.79.240.127.sslip.io` di HP, pilih satu titik, tekan "Open in Google Maps", cocokkan satu nama tempat. Kalau cocok, kamu punya bukti.
2. Jangan sebut `showcase.sinarmediasakti.com` sama sekali. Itu versi lama yang masih salah.
3. Kalau ditanya "kenapa ada yang 45,0 semua?" — jawab: *"karena semua kategorinya sudah mentok batas nilai, jadi nilainya maksimal. Yang belum beres adalah cara mengurutkan yang seri."* Itu jawaban jujur dan bisa dipertahankan.
