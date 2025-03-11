const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function saveMessageToLog(message) {
  const logFile = 'chat_logs.txt';
  const timestamp = new Date().toLocaleString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  fs.appendFileSync(logFile, logEntry);
}

let shouldReconnect = true;
let retryCount = 0;
const MAX_RETRIES = 3;

async function startWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: P({ level: 'warn' }),
      connectTimeoutMs: 30000,
      retryRequestDelayMs: 3000
    });
    
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`❌ Koneksi terputus. Status: ${statusCode}`);
        
        if (statusCode === DisconnectReason.loggedOut) {
          console.log('🚫 Perangkat telah logout. Silakan restart aplikasi.');
          shouldReconnect = false;
          process.exit(1);
        }
        
        if (shouldReconnect && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`🔄 Mencoba menghubungkan kembali (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(() => {
            startWhatsApp();
          }, 5000);
        } else if (retryCount >= MAX_RETRIES) {
          console.log('⚠️ Batas maksimum percobaan tercapai. Silakan restart aplikasi.');
          process.exit(1);
        }
      }
      
      if (connection === 'connecting') {
        if (!global.phoneAsked) {
          global.phoneAsked = true;
          
          console.log('\n📱 ========= WHATSAPP PAIRING =========');
          rl.question('📞 Masukkan nomor WhatsApp Anda (contoh: 62812345xxxx): ', async (phoneNumber) => {
            const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
            console.log(`\n🔍 Meminta kode pairing untuk ${cleanNumber}...`);
            
            try {
              const code = await sock.requestPairingCode(cleanNumber);
              
              console.log('\n🔐 ================================');
              console.log(`    KODE PAIRING: ${code}`);
              console.log('================================\n');
              console.log('📋 Langkah-langkah:');
              console.log('1️⃣ Buka WhatsApp di HP Anda');
              console.log('2️⃣ Masuk ke Pengaturan > Perangkat Tertaut');
              console.log('3️⃣ Ketuk Tautkan Perangkat');
              console.log('4️⃣ Masukkan kode di atas\n');
              console.log('⏳ Menunggu Anda memasukkan kode...');
              
            } catch (error) {
              console.error('❌ Gagal mendapatkan kode:', error.message);
              console.log('⚠️ Pastikan nomor WhatsApp Anda benar dan coba lagi.');
              shouldReconnect = false;
              process.exit(1);
            }
          });
        }
      }
      
      if (connection === 'open') {
        console.log('\n✅ Berhasil terhubung ke WhatsApp!');
        console.log('👂 Mendengarkan pesan masuk...\n');
        retryCount = 0;
      }
    });
    
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const message of messages) {
        if (!message.key.fromMe && message.message) {
          const from = message.key.remoteJid;
          const participant = message.key.participant || from;
          const messageType = Object.keys(message.message)[0];
          
          let messageContent = '';
          let messageEmoji = '💬';
          
          if (message.message.conversation) {
            messageContent = message.message.conversation;
          } else if (message.message.extendedTextMessage) {
            messageContent = message.message.extendedTextMessage.text;
          } else if (message.message.imageMessage) {
            messageEmoji = '🖼️';
            messageContent = message.message.imageMessage.caption || '[Image received]';
          } else if (message.message.videoMessage) {
            messageEmoji = '🎥';
            messageContent = message.message.videoMessage.caption || '[Video received]';
          } else if (message.message.documentMessage) {
            messageEmoji = '📄';
            messageContent = '[Document received]';
          } else if (message.message.stickerMessage) {
            messageEmoji = '🎯';
            messageContent = '[Sticker received]';
          } else if (message.message.audioMessage) {
            messageEmoji = '🎵';
            messageContent = '[Audio received]';
          } else {
            messageEmoji = '📩';
            messageContent = '[Message received]';
          }

          const sender = participant.split('@')[0];
          const logMessage = `${messageEmoji} From: ${sender} | Type: ${messageType} | Message: ${messageContent}`;
          
          saveMessageToLog(logMessage);
          
          console.log('━━━━━━━━━━ PESAN BARU ━━━━━━━━━━');
          console.log(logMessage);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }
      }
    });
  } catch (err) {
    console.error('❌ Error:', err);
    if (shouldReconnect && retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`🔄 Terjadi kesalahan. Mencoba ulang (${retryCount}/${MAX_RETRIES})...`);
      setTimeout(startWhatsApp, 5000);
    } else {
      console.log('⚠️ Terjadi kesalahan fatal. Silakan restart aplikasi.');
      process.exit(1);
    }
  }
}

console.clear();
console.log('🚀 ====================================');
console.log('    WHATSAPP PAIRING CODE GENERATOR    ');
console.log('====================================\n');
console.log('💡 Tool ini akan menghasilkan kode pairing untuk menghubungkan WhatsApp.\n');

global.phoneAsked = false;

startWhatsApp();