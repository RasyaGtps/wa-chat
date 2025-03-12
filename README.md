# 🚀 WhatsApp Multi-Device API

Aplikasi Node.js untuk menghubungkan WhatsApp menggunakan Pairing Code. Dibuat dengan Baileys.

## ✨ Fitur

- 📱 Koneksi via Pairing Code (tanpa QR scan)
- 💬 Mendukung Multi-Device
- 📝 Auto-logging pesan
- 🔄 Reconnect otomatis
- 🎨 Interface yang menarik dengan emoji
- 📊 Support berbagai jenis pesan (teks, gambar, video, dokumen, dll)

### 🤖 Fitur Bot

1. **Fitur GitHub**
   - `/cekgithub <username>` - Cek info profil GitHub
   - `/listrepo <username>` - Lihat 10 repository terbaru
   - `/cekfollowers <username>` - Lihat daftar followers
   - `/cekfollowing <username>` - Lihat daftar following

2. **Fitur Grup (Admin/Owner)**
   - `/promote <@user>` - Jadikan admin grup
   - `/demote <@user>` - Hapus admin grup
   - `/kick <@user>` - Keluarkan member
   - `/add <nomor>` - Tambah member
   - `/linkgrup` - Dapatkan link invite grup
   - `/revoke` - Reset link grup
   - `/masukgrup <link>` - Join grup via link (owner)
   - `/cekgrup` - Lihat daftar grup yang diikuti (owner)
   - `/keluargrup <id>` - Keluar dari grup (owner)

3. **Fitur Block (Owner Only)**
   - `/block <nomor>` - Blokir pengguna
   - `/unblock <nomor>` - Buka blokir pengguna
   - `/listblock` - Lihat daftar nomor yang diblokir

4. **Fitur Media**
   - `/sticker` - Buat sticker dari gambar/video
   - `/toimg` - Konversi sticker ke gambar

5. **Fitur Bot**
   - `/uptime` - Cek waktu aktif bot
   - `/help` - Tampilkan menu bantuan
   - `/public on/off` - Aktifkan/matikan mode public

## 🎯 Fitur Yang Akan Datang

- 🎮 Hiburan:
  - `/ytmp3 <link>` - Download audio YouTube
  - `/ytmp4 <link>` - Download video YouTube
  - `/play <judul>` - Cari dan putar musik YouTube

- 🛠️ Utilitas:
  - `/translate <text>` - Terjemahkan teks
  - `/shortlink <url>` - Perpendek URL
  - `/weather <kota>` - Cek cuaca
  - `/wiki <query>` - Cari di Wikipedia
  - `/kalkulator <expr>` - Hitung ekspresi matematika

## 🛠️ Instalasi

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
npm install --legacy-peer-deps
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

4. Bot siap digunakan! Ketik `/help` untuk melihat daftar perintah

## 🖥️ Penggunaan di Panel/VPS

### 1. Upload ke Panel
```bash
cd /home/container
git clone https://github.com/RasyaGtps/wa-chat.git
cd wa-chat
npm install --legacy-peer-deps
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