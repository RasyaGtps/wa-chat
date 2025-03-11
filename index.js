const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const readline = require('readline');
const fs = require('fs');
const { getGithubInfo, getRepoList } = require('./feature');
const config = require('./config');

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

// Fungsi untuk mengecek apakah pengirim adalah owner
function isOwner(sender) {
  return config.ownerNumbers.includes(sender);
}

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
          const sender = participant.split('@')[0];
          const messageType = Object.keys(message.message)[0];
          
          let messageContent = '';
          let messageEmoji = '💬';
          let senderInfo = '';
          
          // Debug info dengan format yang lebih rapi
          console.log('\n┌─────────── DEBUG INFO ───────────');
          console.log(`├ Chat ID  : ${from}`);
          console.log(`├ Tipe     : ${from.endsWith('@g.us') ? 'Grup' : 'Pribadi'}`);
          console.log(`├ Sender   : ${participant}`);
          console.log(`└ Push Name: ${message.pushName || 'Tidak ada'}`);
          
          // Cek apakah pesan dari grup
          if (from.endsWith('@g.us')) {
            try {
              const groupMetadata = await sock.groupMetadata(from);
              const senderName = message.pushName || sender;
              senderInfo = `\n┌ Grup: ${groupMetadata.subject}\n├ Dari: ${senderName}`;
            } catch (error) {
              console.log('Debug - Error getting group metadata:', error);
              senderInfo = `\n┌ Grup: Unknown\n├ Dari: ${sender}`;
            }
          } else {
            // Pesan pribadi
            const senderName = message.pushName || sender;
            senderInfo = `\n┌ Pribadi: ${senderName}`;
          }
          
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

          const logMessage = `${messageEmoji} PESAN BARU ${messageEmoji}${senderInfo}\n├ Tipe: ${messageType}\n└ Pesan: ${messageContent}`;
          
          saveMessageToLog(logMessage);
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(logMessage);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          // Handle /cekgithub command (umum)
          if (messageContent.startsWith('/cekgithub ')) {
            const username = messageContent.split(' ')[1];
            if (username) {
              console.log('\n━━━━━━━━━━ CEK GITHUB ━━━━━━━━━━');
              console.log(`🔍 Memproses permintaan cek GitHub untuk: @${username}`);
              try {
                const githubInfo = await getGithubInfo(username);
                // Kirim gambar dengan caption menggunakan file lokal
                await sock.sendMessage(from, { 
                  image: { url: githubInfo.imagePath },
                  caption: githubInfo.caption
                });
                console.log('✅ Berhasil mengirim info GitHub!');
                // Hapus file gambar setelah dikirim
                fs.unlinkSync(githubInfo.imagePath);
                console.log('🗑️ File gambar temporary sudah dibersihkan');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              } catch (error) {
                console.error('❌ Error:', error.message);
                await sock.sendMessage(from, { 
                  text: `❌ ${error.message}`
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              }
            } else {
              console.log('❌ Format command salah!');
              await sock.sendMessage(from, { 
                text: '❌ Format salah! Gunakan: /cekgithub <username>' 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /listrepo command (umum)
          if (messageContent.startsWith('/listrepo ')) {
            const username = messageContent.split(' ')[1];
            if (username) {
              console.log('\n━━━━━━━━━━ LIST REPOSITORY ━━━━━━━━━━');
              console.log(`🔍 Memproses permintaan list repository untuk: @${username}`);
              try {
                const repoList = await getRepoList(username);
                await sock.sendMessage(from, { 
                  text: repoList 
                });
                console.log('✅ Berhasil mengirim daftar repository!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              } catch (error) {
                console.error('❌ Error:', error.message);
                await sock.sendMessage(from, { 
                  text: `❌ ${error.message}`
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              }
            } else {
              console.log('❌ Format command salah!');
              await sock.sendMessage(from, { 
                text: '❌ Format salah! Gunakan: /listrepo <username>' 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /masukgrup command (owner only)
          if (messageContent.startsWith('/masukgrup ')) {
            if (!isOwner(sender)) {
              console.log('❌ Akses ditolak: Bukan owner');
              await sock.sendMessage(from, { 
                text: '❌ Maaf, command ini hanya untuk owner bot!' 
              });
              return;
            }

            const groupLink = messageContent.split(' ')[1];
            if (groupLink) {
              console.log('\n━━━━━━━━━━ MASUK GRUP ━━━━━━━━━━');
              console.log(`🔍 Memproses link grup: ${groupLink}`);
              
              try {
                // Extract group code from the link
                const groupCode = groupLink
                  .replace('https://chat.whatsapp.com/', '')
                  .replace('http://chat.whatsapp.com/', '');

                if (!groupCode) {
                  throw new Error('Link grup tidak valid!');
                }

                // Accept the group invite
                await sock.groupAcceptInvite(groupCode);
                console.log('✅ Berhasil bergabung dengan grup!');
                await sock.sendMessage(from, { 
                  text: '✅ Berhasil bergabung dengan grup WhatsApp!' 
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              } catch (error) {
                console.error('❌ Error:', error.message);
                await sock.sendMessage(from, { 
                  text: `❌ Gagal bergabung dengan grup: ${error.message}`
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              }
            } else {
              console.log('❌ Format command salah!');
              await sock.sendMessage(from, { 
                text: '❌ Format salah! Gunakan: /masukgrup <link_grup>' 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /cekgrup command (owner only)
          if (messageContent === '/cekgrup') {
            if (!isOwner(sender)) {
              console.log('❌ Akses ditolak: Bukan owner');
              await sock.sendMessage(from, { 
                text: '❌ Maaf, command ini hanya untuk owner bot!' 
              });
              return;
            }

            console.log('\n━━━━━━━━━━ CEK GRUP ━━━━━━━━━━');
            try {
              const groups = await sock.groupFetchAllParticipating();
              console.log('📋 Mendapatkan daftar grup...');
              
              if (Object.keys(groups).length === 0) {
                await sock.sendMessage(from, { 
                  text: '📝 Bot belum bergabung dengan grup manapun.' 
                });
                return;
              }

              let groupList = '📋 *DAFTAR GRUP*\n\n';
              let number = 1;

              for (const group of Object.values(groups)) {
                const participantCount = group.participants.length;
                const adminCount = group.participants.filter(p => p.admin).length;
                
                groupList += `${number}. *${group.subject}*\n`;
                groupList += `   ├ ID: ${group.id}\n`;
                groupList += `   ├ Member: ${participantCount}\n`;
                groupList += `   ├ Admin: ${adminCount}\n`;
                groupList += `   └ Dibuat: ${new Date(group.creation * 1000).toLocaleString()}\n\n`;
                
                number++;
              }

              await sock.sendMessage(from, { 
                text: groupList 
              });
              console.log('✅ Berhasil mengirim daftar grup!');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            } catch (error) {
              console.error('❌ Error:', error.message);
              await sock.sendMessage(from, { 
                text: `❌ Gagal mendapatkan daftar grup: ${error.message}` 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /keluargrup command (owner only)
          if (messageContent.startsWith('/keluargrup ')) {
            if (!isOwner(sender)) {
              console.log('❌ Akses ditolak: Bukan owner');
              await sock.sendMessage(from, { 
                text: '❌ Maaf, command ini hanya untuk owner bot!' 
              });
              return;
            }

            const groupId = messageContent.split(' ')[1];
            if (groupId) {
              console.log('\n━━━━━━━━━━ KELUAR GRUP ━━━━━━━━━━');
              console.log(`🔍 Memproses permintaan keluar dari grup: ${groupId}`);
              
              try {
                // Pastikan format ID grup benar
                if (!groupId.endsWith('@g.us')) {
                  throw new Error('Format ID grup tidak valid! Gunakan ID dari /cekgrup');
                }

                // Keluar dari grup
                await sock.groupLeave(groupId);
                console.log('✅ Berhasil keluar dari grup!');
                await sock.sendMessage(from, { 
                  text: '✅ Berhasil keluar dari grup WhatsApp!' 
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              } catch (error) {
                console.error('❌ Error:', error.message);
                await sock.sendMessage(from, { 
                  text: `❌ Gagal keluar dari grup: ${error.message}`
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              }
            } else {
              console.log('❌ Format command salah!');
              await sock.sendMessage(from, { 
                text: '❌ Format salah! Gunakan: /keluargrup <id_grup>\n\nContoh: /keluargrup 123456789@g.us' 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }
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