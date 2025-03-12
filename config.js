const fs = require('fs');

// Konfigurasi nomor owner (ganti dengan nomor WhatsApp Anda)
// Format: gunakan kode negara tanpa tanda + atau 0 di depan
// Contoh: 62812345xxxx

// Default config
let config = {
    // Bisa ditambahkan lebih dari satu nomor owner
    ownerNumbers: [
        "6289515902666",  // Ganti dengan nomor WhatsApp owner
        // "62812345xxxx"   // Tambahkan nomor lain jika perlu
    ],
    // Tambahkan status public mode
    isPublicMode: true  // Default: true (bot merespon di grup)
};

// Path ke file config
const CONFIG_FILE = './config.json';

// Load config dari file jika ada
try {
    if (fs.existsSync(CONFIG_FILE)) {
        const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE));
        config = { ...config, ...savedConfig };
    }
} catch (error) {
    console.error('Error loading config:', error);
}

// Fungsi untuk update config
const updateConfig = (newConfig) => {
    config = { ...config, ...newConfig };
    // Simpan ke file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

module.exports = {
    ...config,
    updateConfig
}; 