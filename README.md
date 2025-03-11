# 🚀 WhatsApp Multi-Device API

Aplikasi Node.js untuk menghubungkan WhatsApp menggunakan Pairing Code. Dibuat dengan Baileys.

## ✨ Fitur

- 📱 Koneksi via Pairing Code (tanpa QR scan)
- 💬 Mendukung Multi-Device
- 📝 Auto-logging pesan
- 🔄 Reconnect otomatis
- 🎨 Interface yang menarik dengan emoji
- 📊 Support berbagai jenis pesan (teks, gambar, video, dokumen, dll)

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
npm install
```

3. Jalankan aplikasi
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

4. Selesai! Bot akan mulai mencatat pesan masuk

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

## 📝 Cara Upload ke GitHub

1. Inisialisasi Git
```bash
git init
```

2. Tambahkan file
```bash
git add .
```

3. Commit perubahan
```bash
git commit -m "first commit"
```

4. Set branch ke main
```bash
git branch -M main
```

5. Tambahkan remote repository
```bash
git remote add origin https://github.com/RasyaGtps/wa-chat.git
```

6. Push ke GitHub
```bash
git push -u origin main
```

## 📊 Log Pesan

Semua pesan akan disimpan di `chat_logs.txt` dengan format:
```
[Timestamp] 💬 From: sender | Type: messageType | Message: content
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

## 📄 Lisensi

MIT License - Silakan gunakan dan modifikasi sesuai kebutuhan!

## 🤝 Kontribusi

Kontribusi selalu welcome! Silakan buat Pull Request atau Issue.

---
Made with ❤️ by Rasya 