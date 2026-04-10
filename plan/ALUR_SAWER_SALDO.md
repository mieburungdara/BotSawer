# 📋 ALUR TOMBOL SAWER DAN PENGECEKAN SALDO

---

## ✅ ✅ ✅ INFORMASI PENTING:
✅ **TRANSAKSI SAWER ADALAH OTOMATIS 100%**
✅ TIDAK PERLU KONFIRMASI ADMIN SAMA SEKALI
✅ ✅ YANG PERLU KONFIRMASI MANUAL ADMIN HANYA:
✅ 1. Topup saldo pengguna
✅ 2. Penarikan saldo kreator

---

## 🔄 ALUR LENGKAP KETIKA PENGGUNA KLIK DEEPLINK

```
┌───────────────────────────────────────────────────────────────────┐
│ Pengguna klik deeplink dari channel publik                       │
├───────────────────────────────────────────────────────────────────┤
│ ✅ Bot ambil data media dari database                            │
│ ✅ Bot kirim MEDIA ASLI ke pengguna secara PRIVATE               │
│ ✅ ✅ BOT CEK SALDO PENGGUNA TERLEBIH DAHULU                      │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🧪 KONDISI 1: SALDO PENGGUNA = 0 RP
```
✅ JANGAN TAMPILKAN INLINE KEYBOARD APAPUN
✅ Kirim pesan dibawah media:
⚠️ Saldo anda saat ini adalah Rp 0
💡 Untuk melakukan sawer silahkan lakukan topup terlebih dahulu
👉 Kirim perintah /topup untuk mengisi saldo
```

---

## 🧪 KONDISI 2: SALDO PENGGUNA > 0 RP
```
✅ TAMPILKAN INLINE KEYBOARD DENGAN PILIHAN NOMINAL SAWER:
┌─────────────────────────────────────────────────┐
│  💸 100  │ 💸 500  │ 💸 1K  │ 💸 2K  │ 💸 5K   │
├─────────────────────────────────────────────────┤
│  💸 10K   │ 💸 25K  │ 💸 50K  │ 💸 100K        │
└─────────────────────────────────────────────────┘
```

---

## 🧪 KONDISI 3: PENGGUNA PILIH NOMINAL SAWER
```
✅ Bot cek kembali saldo pengguna:
❌ Jika SALDO TIDAK CUKUP:
   ⚠️ Maaf saldo anda tidak mencukupi untuk nominal Rp XXX
   ✅ Tampilkan ulang keyboard HANYA DENGAN NOMINAL YANG MASIH BISA DIBAYAR
   ✅ Contoh: jika saldo 12.000 maka hanya tampilkan pilihan 100,500,1K,2K,5K,10K saja

❌ JIKA TIDAK ADA NOMINAL YANG SESUAI DENGAN SALDO:
   ⚠️ Saldo anda tidak cukup untuk melakukan sawer
   👉 Silahkan lakukan /topup terlebih dahulu
   ✅ JANGAN TAMPILKAN INLINE KEYBOARD APAPUN

✅ JIKA SALDO CUKUP:
   ✅ ✅ ✅ TRANSAKSI OTOMATIS TANPA KONFIRMASI ADMIN
   ✅ Potong saldo donatur secara otomatis
   ✅ Pindahkan saldo ke kreator secara otomatis
   ✅ Kirim notifikasi terima kasih ke donatur
   ✅ Kirim notifikasi ke kreator bahwa ada yang melakukan sawer
   ✅ Catat semua ke riwayat transaksi
```

---

## ⚡ FITUR /TOPUP DAN /SALDO

### 👉 Perintah /saldo
```
Ketika pengguna kirim /saldo:
✅ Bot ambil saldo realtime dari database
✅ Bot membalas dengan format:

💼 INFORMASI SALDO ANDA
━━━━━━━━━━━━━━━━━━━━━━━━
💰 Saldo Tersedia: Rp 145.200
━━━━━━━━━━━━━━━━━━━━━━━━

💡 Gunakan saldo ini untuk melakukan sawer ke kreator
👉 Ketik /topup untuk menambah saldo
```

### 👉 Perintah /topup
```
Ketika pengguna kirim /topup:
✅ Bot kirim PHOTO QRCODE dompet digital admin
✅ Tampilkan nomor rekening dan panduan transfer
✅ Pengguna transfer bukti transfer ke bot
✅ Admin konfirmasi secara manual
✅ Saldo pengguna bertambah setelah dikonfirmasi
```

---

## ✅ ALUR TOPUP SALDO BARU:
✅ ❌ TIDAK ADA SALDO PENDING
✅ Pengguna kirim bukti screenshot transfer dan jumlah ke bot
✅ Bot meneruskan bukti dan informasi ke admin
✅ Bot mengirimkan tombol `✅ Konfirmasi Topup` ke admin
✅ Admin klik tombol langsung masuk ke Telegram Mini App
✅ ✅ Form di webapp OTOMATIS TERISI user id pengguna
✅ Admin hanya perlu masukkan nominal yang diterima
✅ Pilih jenis transaksi
✅ Klik simpan, saldo pengguna langsung bertambah
✅ ✅ TIDAK ADA TAHAPAN PENDING, SALDO LANGSUNG TAMBAH

## ✅ RINGKASAN KONFIRMASI MANUAL ADMIN:
| Jenis Transaksi | Butuh Konfirmasi Admin |
|-----------------|-------------------------|
| ✅ Sawer Donatur | ❌ TIDAK PERLU, OTOMATIS |
| ✅ Topup Saldo | ✅ PERLU via Mini App |
| ✅ Penarikan Kreator | ✅ PERLU via Mini App |

---

## ✅ UPDATE CLASS WALLET
Tambah method `getMaxAvailableAmount()` untuk cek nominal maksimal yang bisa dikeluarkan pengguna:

```php
public static function getAvailableNominalOptions(int $userId, array $nominalList): array
{
    $balance = self::getBalance($userId);
    return array_filter($nominalList, fn($nominal) => $nominal <= $balance);
}
```

---

## ✅ DAFTAR NOMINAL SAWER DEFAULT:
```php
$defaultNominalOptions = [
    100,
    500,
    1000,
    2000,
    5000,
    10000,
    25000,
    50000,
    100000
];
```

---

## ✅ LOGIC ALGORITMA:
```php
1. Ambil saldo pengguna
2. Jika saldo == 0: tampilkan pesan topup
3. Filter daftar nominal yang <= saldo
4. Jika hasil filter kosong: tampilkan pesan topup
5. Jika ada hasil: buat inline keyboard dari hasil filter
6. Ketika pengguna pilih: cek saldo kembali (race condition protection)
7. Jika masih cukup: lakukan transaksi otomatis
8. Jika tidak cukup: ulangi filter dan tampilkan keyboard baru
```

## ✅ KOLOM WALLET FINAL:
✅ `balance` - Saldo yang bisa digunakan SAAT INI
✅ ❌ `pending_balance` - TIDAK DIGUNAKAN LAGI
✅ `total_deposit` - Total topup yang pernah diterima
✅ `total_withdraw` - Total penarikan yang pernah dilakukan

✅ Alur ini memastikan tidak ada pengguna yang bisa sawer melebihi saldonya, dan selalu memberikan feedback yang jelas kepada pengguna sesuai kondisi saldonya saat itu.