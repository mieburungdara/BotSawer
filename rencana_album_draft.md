# Rencana Implementasi: Penggabungan Multi-Album (Draft Session)

*Dokumen ini merupakan panduan teknis untuk menggabungkan banyak media/album ke dalam satu konten tunggal.*

## 1. Konsep Utama: "Sesi Draft"
Kreator seringkali mengirim lebih dari 10 media (batas maksimal Telegram per album). Untuk memberikan pengalaman terbaik, kita akan menggunakan sistem **Draft Session**.

- Setiap Creator hanya memiliki maksimal **1 Konten Draft** aktif dalam satu waktu.
- Semua media yang dikirim Creator ke bot (baik foto tunggal maupun album) akan otomatis "menumpuk" ke dalam draft tersebut.
- Proses penggabungan berakhir setelah Creator menekan tombol **"Konfirmasi & Publikasikan"** di WebApp.

## 2. Alur Teknis (Flow)
1. **Penerimaan Media**: Bot menerima pesan berisi foto/video.
2. **Cek Draft**: Bot mencari di tabel `contents` apakah ada baris milik `user_id` tersebut dengan `status = 'draft'`.
3. **Penyatuan (Merging)**:
    - Jika Draft Ditemukan: Media baru disimpan ke tabel `media_files` dengan `content_id` merujuk ke draft tersebut.
    - Jika Draft Tidak Ada: Bot membuat baris baru di tabel `contents` dengan status `draft`, lalu menyimpan media ke `media_files`.
4. **Notifikasi Cerdas (Anti-Spam)**:
    - Menggunakan logika `media_group_id` dan `bot_id` untuk memastikan hanya 1 pesan balasan yang dikirim ke user per album.
    - Menambahkan mekanisme *Debounce/Timer* (khusus di Node.js) untuk menunggu beberapa detik sebelum mengirim ringkasan "X foto berhasil ditambahkan ke Draft".

## 3. Struktur Database
- **Tabel `contents`**: Menyimpan metadata (caption, harga, status, user_id, bot_id).
- **Tabel `media_files`**: Menyimpan setiap item media yang terhubung ke `contents.id`.

## 4. Keuntungan Setelah Migrasi ke Node.js
- **Asynchronous Processing**: Menangani 10-20 file sekaligus tanpa membebani server.
- **In-Memory Locking**: Mencegah *race condition* saat dua album dikirim hampir bersamaan.
- **Timer Management**: Kemudahan implementasi fitur "menunggu 5 detik sebelum memproses album".

---
*Catatan: Implementasi ini akan dimulai segera setelah struktur dasar backend Node.js selesai disiapkan.*
