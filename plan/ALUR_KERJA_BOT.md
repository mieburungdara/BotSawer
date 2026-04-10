# 📋 ALUR KERJA BOT SAWER - SESUAI SPESIFIKASI

---

## 🔄 ALUR UTAMA BOT

```
┌───────────────────────────────────────────────────────────────────┐
│ 1️⃣ KREATORMENGIRIM MEDIA KE BOT                                  │
├───────────────────────────────────────────────────────────────────┤
│ ✅ User A (Kreator) kirim foto/video langsung ke Bot             │
│ ✅ Bot menerima media dan menyimpan file_id Telegram              │
│ ✅ Bot membalas: "✅ Media anda diterima, akan dipost sesuai antrian │
│                  Nomor antrian: #XXX"                            │
│ ✅ Media diteruskan otomatis ke Channel Backup (private)         │
│ ✅ Data media disimpan di database dengan status `queued`         │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ 2️⃣ BOT POST KE CHANNEL PUBLIK (HANYA CAPTION TEXT SAJA)          │
├───────────────────────────────────────────────────────────────────┤
│ ✅ Cron Job berjalan setiap menit mengecek antrian               │
│ ✅ Jika sudah waktunya, Bot mengambil media dari antrian          │
│ ✅ ✅ BOT TIDAK MEMPOSTING FOTO/VIDEO KE CHANNEL PUBLIK          │
│ ✅ Bot memposting HANYA CAPTION TEXT SAJA:                        │
│    ├─ Judul / deskripsi konten                                   │
│    └─ 🔗 TOMBOL DEEPLINK: https://t.me/NamaBot?start=media_XXXX  │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ 3️⃣ PENGGUNA MENGAKSES MEDIA MELALUI DEEPLINK                     │
├───────────────────────────────────────────────────────────────────┤
│ ✅ User B melihat postingan caption di Channel Publik             │
│ ✅ User B klik tombol link yang ada di postingan                  │
│ ✅ User B langsung diarahkan ke Bot Telegram                      │
│ ✅ ✅ DISINI BARU BOT MENGIRIMKAN MEDIA ASLI KEPADA USER B        │
│ ✅ Dibawah media ditampilkan Inline Button bertuliskan:           │
│                           💸 SAWER                               │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ 4️⃣ PENGGUNA MELAKUKAN SAWER (DONASI)                             │
├───────────────────────────────────────────────────────────────────┤
│ ✅ User B klik tombol `Sawer`                                     │
│ ✅ Bot menampilkan pilihan nominal sawer                          │
│ ✅ User B memilih nominal dan konfirmasi                          │
│ ✅ Bot menampilkan nomor rekening transfer                        │
│ ✅ User B transfer dan kirim bukti pembayaran                     │
│ ✅ Admin memverifikasi dan mengkonfirmasi                         │
│ ✅ Saldo Kreator (User A) bertambah otomatis                      │
│ ✅ Kedua pihak mendapatkan notifikasi konfirmasi                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📊 FLOWCHART SISTEM

```
Kreator Kirim Media → Bot Terima → Simpan Database → Channel Backup
                                                          ↓
                                                    Antrian Jadwal
                                                          ↓
                                                     Cron Job
                                                          ↓
                                                  Post ke Channel Publik
                                                          ↓
                                        ✅ HANYA CAPTION TEXT SAJA
                                                          ↓
                                            + Deeplink ?start=media_XX
                                                          ↓
                                              Pengguna klik Deeplink
                                                          ↓
                                          ✅ Bot kirim MEDIA ASLI ke Pengguna
                                                          ↓
                                            + Inline Button "Sawer"
                                                          ↓
                                              Pengguna klik Sawer
                                                          ↓
                                            Transfer Bukti Pembayaran
                                                          ↓
                                              Admin Konfirmasi Manual
                                                          ↓
                                          Saldo Kreator Bertambah ✅
```

---

## ✅ ALASAN DESAIN INI:
✅ ❌ MEDIA TIDAK PERNAH TERSEBAR DI CHANNEL PUBLIK
✅ Semua orang WAJIB masuk ke bot untuk melihat konten penuh
✅ Semua orang akan melihat tombol Sawer
✅ 100% traffic masuk ke bot, tidak ada yang bypass
✅ Kreator mendapatkan eksposur maksimal

---

## ✅ Fitur Tambahan Yang Dibutuhkan:
1. **Sistem Antrian Media** - setiap kreator punya antrian posting
2. **Scheduler / Cron Job** - post otomatis sesuai jadwal
3. **Channel Backup** - semua media yang masuk disimpan disini untuk arsip
4. **Deeplink Generator** - setiap media punya link unik ke bot
5. **Start Parameter Handler** - bot menangkap parameter `?start=media_XXXX`
6. **Inline Keyboard Button "Sawer"** dibawah setiap media yang dikirim ke pengguna

---

## 📝 Update Tabel Database
Tambah kolom di tabel `media_files`:
```sql
ALTER TABLE `media_files`
ADD COLUMN `queue_number` INT UNSIGNED NULL,
ADD COLUMN `scheduled_at` TIMESTAMP NULL,
ADD COLUMN `posted_at` TIMESTAMP NULL,
ADD COLUMN `status` ENUM('queued','scheduled','posted','cancelled') DEFAULT 'queued',
ADD INDEX `idx_status_scheduled` (`status`, `scheduled_at`);
```

---

## ⏰ CRON JOB ANTRIAN POSTING
✅ Setiap media di posting dengan JEDAH 1 MENIT ANTAR MEDIA
✅ Hanya 1 media yang diposting setiap menit
✅ Tidak akan pernah ada postingan bertubi-tubi

```bash
# Jalankan SETIAP MENIT SEKALI
* * * * * cd /path/to/project && php schedule.php
```

✅ Logika Scheduler:
1. Ketika kreator mengirim media:
2. Cek apakah antrian kosong dan tidak ada postingan di menit ini
3. ✅ JIKA KOSONG: langsung POST SEKARANG KE CHANNEL PUBLIK
4. ✅ JIKA ADA ANTRIAN: masukkan ke antrian, tunggu giliran 1 menit jeda
5. Setiap menit cron job berjalan mengambil 1 media dari antrian
6. Post media tersebut ke channel publik
7. Update status menjadi `posted`
8. Keluar, tunggu menit berikutnya

✅ Alur ini 100% sesuai dengan yang anda deskripsikan. Channel publik HANYA MENAMPILKAN CAPTION TEXT saja, tidak pernah menampilkan foto/video asli. Semua orang harus klik link dan masuk ke bot untuk mendapatkan konten penuh beserta tombol sawer.