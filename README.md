# 🚀 WhatsApp Multi-Device API

Aplikasi Node.js untuk menghubungkan WhatsApp menggunakan Pairing Code. Dibuat dengan Baileys.

## ✨ Fitur

- 📱 Koneksi via Pairing Code (tanpa QR scan)
- 💬 Mendukung Multi-Device
- 📝 Auto-logging pesan
- 🔄 Reconnect otomatis
- 🎨 Interface yang menarik dengan emoji
- 📊 Support berbagai jenis pesan (teks, gambar, video, dokumen, dll)
- 🤖 Fitur Bot:
  - `/cekgithub <username>` - Cek info profil GitHub (publik)
  - `/listrepo <username>` - Lihat 10 repository terbaru user
  - `/masukgrup <link>` - Join grup via link (owner only)
  - `/cekgrup` - Lihat daftar grup yang diikuti (owner only)
  - `/keluargrup <id>` - Keluar dari grup (owner only)

## 🎯 Fitur Yang Akan Datang

- 📊 Statistik Bot:
  - `/stats` - Lihat statistik penggunaan bot
  - `/uptime` - Cek waktu aktif bot
  - `/ping` - Cek respon time bot

- 🛡️ Keamanan:
  - `/block <nomor>` - Blokir pengguna (owner)
  - `/unblock <nomor>` - Buka blokir pengguna (owner)
  - `/listblock` - Lihat daftar nomor yang diblokir

- 📱 Manajemen Grup:
  - `/promote <@user>` - Jadikan admin grup
  - `/demote <@user>` - Hapus admin grup
  - `/kick <@user>` - Keluarkan member
  - `/add <nomor>` - Tambah member
  - `/linkgrup` - Dapatkan link invite grup
  - `/revoke` - Reset link grup
  - `/setdesc <text>` - Ubah deskripsi grup
  - `/setname <text>` - Ubah nama grup

- 🎮 Hiburan:
  - `/sticker` - Buat sticker dari gambar/video
  - `/toimg` - Konversi sticker ke gambar
  - `/ytmp3 <link>` - Download audio YouTube
  - `/ytmp4 <link>` - Download video YouTube
  - `/play <judul>` - Cari dan putar musik YouTube

- 🛠️ Utilitas:
  - `/translate <text>` - Terjemahkan teks
  - `/shortlink <url>` - Perpendek URL
  - `/weather <kota>` - Cek cuaca
  - `/wiki <query>` - Cari di Wikipedia
  - `/kalkulator <expr>` - Hitung ekspresi matematika

## ��️ Instalasi

### Prasyarat
- Node.js v14 atau lebih baru
- npm v6 atau lebih baru
- Git

### Langkah Instalasi

1. Clone repository
```bash
git clone https://github.com/RasyaGtps/wa-chat.git
cd wa-chat
```

2. Install dependencies
```bash
npm install
```

3. Konfigurasi owner
- Edit file `config.js`
- Ganti nomor WhatsApp owner
```javascript
ownerNumbers: [
    "62812345xxxx",  // Ganti dengan nomor WhatsApp owner
]
```

4. Jalankan aplikasi
```bash
node index.js
```

## 📱 Cara Penggunaan

1. Jalankan aplikasi
```bash
node index.js
```

2. Masukkan nomor WhatsApp
- Format: 62812345xxxx (awali dengan 62)
- Contoh: 6281234567890

3. Ikuti langkah pairing:
   - Buka WhatsApp di HP
   - Buka Pengaturan > Perangkat Tertaut
   - Ketuk Tautkan Perangkat
   - Masukkan kode yang muncul di terminal

4. Bot siap digunakan! Tersedia command:
   - Cek GitHub: `/cekgithub <username>`
   - List Repo: `/listrepo <username>`
   - Join Grup: `/masukgrup <link>` (owner)
   - Cek Grup: `/cekgrup` (owner)
   - Keluar Grup: `/keluargrup <id>` (owner)

## 🖥️ Penggunaan di Panel/VPS

### 1. Upload ke Panel
```bash
cd /home/container  # Masuk ke direktori container
git clone https://github.com/RasyaGtps/wa-chat.git
cd wa-chat
npm install
```

### 2. Setup di Panel
- Startup File: `index.js`
- Node Version: `16.x` atau lebih baru
- Allocation Memory: Minimal 512 MB

### 3. Environment Variables (Opsional)
```env
TZ=Asia/Jakarta
```

### 4. Start Command
```bash
node index.js
```

## 📝 Format Log Pesan

Semua pesan akan disimpan di `chat_logs.txt` dengan format:
```
[Timestamp] 💬 PESAN BARU 💬
┌ Grup/Pribadi: Nama
├ Dari: Pengirim
├ Tipe: Jenis Pesan
└ Pesan: Isi Pesan
```

## ⚠️ Troubleshooting

1. Jika terjadi error "Connection closed":
   - Pastikan nomor WhatsApp benar
   - Cek koneksi internet
   - Restart aplikasi

2. Jika pairing code tidak muncul:
   - Pastikan format nomor benar (62xxx)
   - Coba restart aplikasi
   - Hapus folder `auth_info_baileys`

3. Jika fitur GitHub error:
   - Pastikan username GitHub benar
   - Cek koneksi internet
   - Pastikan repository bersifat publik

## 📄 Lisensi

MIT License - Silakan gunakan dan modifikasi sesuai kebutuhan!

## 🤝 Kontribusi

Kontribusi selalu welcome! Silakan buat Pull Request atau Issue.

---
Made with ❤️ by Rasya 