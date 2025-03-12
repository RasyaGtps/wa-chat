const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');
const readline = require('readline');
const fs = require('fs');
const { getGithubInfo, getRepoList, getUptime, resetUptime, getFollowers, getFollowing } = require('./feature');
const config = require('./config');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const sharp = require('sharp');
const webp = require('webp-converter');
const { tmpdir } = require('os');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const path = require('path');

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

// Tambahkan flag global untuk mengontrol prompt
let hasAskedPhone = false;

// Fungsi untuk mengecek apakah pengirim adalah owner
function isOwner(sender) {
  return config.ownerNumbers.includes(sender);
}

async function startWhatsApp() {
  try {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
    // Cek apakah sudah ada credentials tersimpan
    const hasCredentials = state?.creds?.me?.id ? true : false;

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'silent' }),
    connectTimeoutMs: 60000,
    retryRequestDelayMs: 5000,
    browser: ['WA-Bot', 'Chrome', '1.0.0'],
    defaultQueryTimeoutMs: 60000
  });
    
    // Reset uptime saat bot mulai
    resetUptime();
    
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        
        console.log(`❌ Koneksi terputus dengan status: ${statusCode}`);
        
        if (shouldReconnect && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`🔄 Mencoba menghubungkan kembali (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(startWhatsApp, 5000);
        } else if (statusCode === DisconnectReason.loggedOut) {
          console.log('🚫 Perangkat telah logout. Silakan restart aplikasi.');
          process.exit(1);
        } else {
          console.log('⚠️ Batas maksimum percobaan tercapai. Silakan restart aplikasi.');
          process.exit(1);
        }
      } else if (connection === 'connecting') {
        // Hanya minta nomor jika belum ada credentials
        if (!hasCredentials && !hasAskedPhone) {
          hasAskedPhone = true;
          console.log('\n🔄 ========= WHATSAPP PAIRING =========');
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
              process.exit(1);
            }
          });
        } else {
          console.log('🔄 Menghubungkan kembali...');
        }
      } else if (connection === 'open') {
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
          const isGroup = from.endsWith('@g.us');
          
          // Cek apakah pesan dari grup dan mode public OFF
          if (isGroup && !config.isPublicMode && !isOwner(sender)) {
            return; // Abaikan pesan jika dari grup dan mode public OFF
          }
          
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

          // Handle /cekfollowers command (umum)
          if (messageContent.startsWith('/cekfollowers ')) {
            const username = messageContent.split(' ')[1];
            if (username) {
              console.log('\n━━━━━━━━━━ CEK FOLLOWERS ━━━━━━━━━━');
              console.log(`🔍 Memproses permintaan cek followers untuk: @${username}`);
              try {
                const followerList = await getFollowers(username);
                await sock.sendMessage(from, { 
                  text: followerList 
                });
                console.log('✅ Berhasil mengirim daftar followers!');
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
                text: '❌ Format salah! Gunakan: /cekfollowers <username>' 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /cekfollowing command (umum)
          if (messageContent.startsWith('/cekfollowing ')) {
            const username = messageContent.split(' ')[1];
            if (username) {
              console.log('\n━━━━━━━━━━ CEK FOLLOWING ━━━━━━━━━━');
              console.log(`🔍 Memproses permintaan cek following untuk: @${username}`);
              try {
                const followingList = await getFollowing(username);
                await sock.sendMessage(from, { 
                  text: followingList 
                });
                console.log('✅ Berhasil mengirim daftar following!');
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
                text: '❌ Format salah! Gunakan: /cekfollowing <username>' 
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

          // Handle /uptime command
          if (messageContent === '/uptime') {
            console.log('\n━━━━━━━━━━ UPTIME ━━━━━━━━━━');
            console.log('📊 Memproses permintaan status bot...');
            try {
              const status = getUptime();
              await sock.sendMessage(from, { 
                text: status 
              });
              console.log('✅ Berhasil mengirim status bot!');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            } catch (error) {
              console.error('❌ Error:', error.message);
              await sock.sendMessage(from, { 
                text: '❌ Gagal mendapatkan status bot!' 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /block command (owner only)
          if (messageContent.startsWith('/block ')) {
            if (!isOwner(sender)) {
              console.log('❌ Akses ditolak: Bukan owner');
              await sock.sendMessage(from, { 
                text: '❌ Maaf, command ini hanya untuk owner bot!' 
              });
              return;
            }

            const number = messageContent.split(' ')[1];
            if (number) {
              console.log('\n━━━━━━━━━━ BLOCK USER ━━━━━━━━━━');
              console.log(`🔒 Memproses permintaan block: ${number}`);
              
              try {
                // Format nomor
                const formattedNumber = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                
                // Block user
                await sock.updateBlockStatus(formattedNumber, "block");
                console.log('✅ Berhasil memblokir user!');
                await sock.sendMessage(from, { 
                  text: `✅ Berhasil memblokir nomor: ${number}` 
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              } catch (error) {
                console.error('❌ Error:', error.message);
                await sock.sendMessage(from, { 
                  text: `❌ Gagal memblokir: ${error.message}` 
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              }
            } else {
              console.log('❌ Format command salah!');
              await sock.sendMessage(from, { 
                text: '❌ Format salah! Gunakan: /block <nomor>\n\nContoh: /block 6281234567890' 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /unblock command (owner only)
          if (messageContent.startsWith('/unblock ')) {
            if (!isOwner(sender)) {
              console.log('❌ Akses ditolak: Bukan owner');
              await sock.sendMessage(from, { 
                text: '❌ Maaf, command ini hanya untuk owner bot!' 
              });
              return;
            }

            const number = messageContent.split(' ')[1];
            if (number) {
              console.log('\n━━━━━━━━━━ UNBLOCK USER ━━━━━━━━━━');
              console.log(`🔓 Memproses permintaan unblock: ${number}`);
              
              try {
                // Format nomor
                const formattedNumber = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                
                // Unblock user
                await sock.updateBlockStatus(formattedNumber, "unblock");
                console.log('✅ Berhasil membuka blokir user!');
                await sock.sendMessage(from, { 
                  text: `✅ Berhasil membuka blokir nomor: ${number}` 
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              } catch (error) {
                console.error('❌ Error:', error.message);
                await sock.sendMessage(from, { 
                  text: `❌ Gagal membuka blokir: ${error.message}` 
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              }
            } else {
              console.log('❌ Format command salah!');
              await sock.sendMessage(from, { 
                text: '❌ Format salah! Gunakan: /unblock <nomor>\n\nContoh: /unblock 6281234567890' 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /listblock command (owner only)
          if (messageContent === '/listblock') {
            if (!isOwner(sender)) {
              console.log('❌ Akses ditolak: Bukan owner');
              await sock.sendMessage(from, { 
                text: '❌ Maaf, command ini hanya untuk owner bot!' 
              });
              return;
            }

            console.log('\n━━━━━━━━━━ LIST BLOCKED ━━━━━━━━━━');
            console.log('📋 Mendapatkan daftar nomor yang diblokir...');
            
            try {
              const blockedNumbers = await sock.fetchBlocklist();
              
              if (blockedNumbers.length === 0) {
                await sock.sendMessage(from, { 
                  text: '📝 Tidak ada nomor yang diblokir.' 
                });
                return;
              }

              let blockList = '🚫 *DAFTAR NOMOR YANG DIBLOKIR*\n\n';
              blockedNumbers.forEach((number, index) => {
                const formattedNumber = number.replace('@s.whatsapp.net', '');
                blockList += `${index + 1}. +${formattedNumber}\n`;
              });
              
              blockList += '\nGunakan command /unblock <nomor> untuk membuka blokir.';

              await sock.sendMessage(from, { 
                text: blockList 
              });
              console.log('✅ Berhasil mengirim daftar nomor yang diblokir!');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            } catch (error) {
              console.error('❌ Error:', error.message);
              await sock.sendMessage(from, { 
                text: `❌ Gagal mendapatkan daftar blokir: ${error.message}` 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /public command (owner only)
          if (messageContent.startsWith('/public ')) {
            if (!isOwner(sender)) {
              console.log('❌ Akses ditolak: Bukan owner');
              await sock.sendMessage(from, { 
                text: '❌ Maaf, command ini hanya untuk owner bot!' 
              });
              return;
            }

            const mode = messageContent.split(' ')[1]?.toLowerCase();
            console.log('\n━━━━━━━━━━ PUBLIC MODE ━━━━━━━━━━');
            console.log(`🔧 Mengubah mode public: ${mode}`);

            if (mode === 'on' || mode === 'off') {
              // Update config dan simpan ke file
              config.updateConfig({ isPublicMode: mode === 'on' });
              
              await sock.sendMessage(from, { 
                text: `✅ Mode public berhasil di${mode.toUpperCase()}kan!\n\n` +
                      `📝 Status: ${config.isPublicMode ? 'Bot dapat merespon di grup' : 'Bot hanya merespon owner di grup'}\n` +
                      `💾 Pengaturan telah disimpan secara permanen.` 
              });
              console.log(`✅ Mode public berhasil diubah ke: ${mode.toUpperCase()}`);
            } else {
              await sock.sendMessage(from, { 
                text: '❌ Format salah! Gunakan: /public on atau /public off' 
              });
              console.log('❌ Format command salah!');
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          }

          // Handle /help command
          if (messageContent === '/help') {
            console.log('\n━━━━━━━━━━ HELP MENU ━━━━━━━━━━');
            console.log('📋 Menampilkan daftar perintah...');
            
            try {
              const helpMessage = `🤖 *DAFTAR PERINTAH BOT*\n\n` +
                `*1. Fitur GitHub*\n` +
                `├ /cekgithub <username> - Cek info profil GitHub\n` +
                `├ /listrepo <username> - Lihat 10 repository terbaru\n` +
                `├ /cekfollowers <username> - Lihat daftar followers\n` +
                `└ /cekfollowing <username> - Lihat daftar following\n\n` +
                
                `*2. Fitur Grup (Admin/Owner)*\n` +
                `├ /promote <@user> - Jadikan admin grup\n` +
                `├ /demote <@user> - Hapus admin grup\n` +
                `├ /kick <@user> - Keluarkan member\n` +
                `├ /add <nomor> - Tambah member\n` +
                `├ /linkgrup - Dapatkan link invite grup\n` +
                `├ /revoke - Reset link grup\n` +
                `├ /masukgrup <link> - Join grup via link\n` +
                `├ /cekgrup - Lihat daftar grup yang diikuti\n` +
                `└ /keluargrup <id> - Keluar dari grup\n\n` +
                
                `*3. Fitur Block (Owner Only)*\n` +
                `├ /block <nomor> - Blokir pengguna\n` +
                `├ /unblock <nomor> - Buka blokir pengguna\n` +
                `└ /listblock - Lihat daftar nomor yang diblokir\n\n` +
                
                `*4. Fitur Media*\n` +
                `├ /sticker - Buat sticker dari gambar/video\n` +
                `└ /toimg - Konversi sticker ke gambar\n\n` +
                
                `*5. Fitur Bot*\n` +
                `├ /uptime - Cek waktu aktif bot\n` +
                `├ /help - Tampilkan menu bantuan ini\n` +
                `└ /public on/off - Aktifkan/matikan mode public\n\n` +
                
                `*Format Nomor:* 62812345xxxx (awali dengan 62)\n` +
                `*Format ID Grup:* 123456789@g.us\n\n` +
                
                `_Note: Fitur owner hanya bisa digunakan oleh pemilik bot._\n` +
                `_Mode Public OFF = Bot hanya merespon owner di grup_`;

              await sock.sendMessage(from, { 
                text: helpMessage 
              });
              console.log('✅ Berhasil mengirim daftar perintah!');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            } catch (error) {
              console.error('❌ Error:', error.message);
              await sock.sendMessage(from, { 
                text: '❌ Gagal menampilkan menu bantuan!' 
              });
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
          }

          // Handle /promote command (admin/owner only)
          if (messageContent.startsWith('/promote ')) {
            if (!isGroup) {
              await sock.sendMessage(from, { text: '❌ Perintah ini hanya dapat digunakan di grup!' });
              return;
            }
            
            // Cek apakah bot adalah admin
            const groupMetadata = await sock.groupMetadata(from);
            const botNumber = sock.user.id.split(':')[0];
            const isBotAdmin = groupMetadata.participants.find(p => p.id.split('@')[0] === botNumber && p.admin);
            const isAdmin = groupMetadata.participants.find(p => p.id === participant && p.admin);
            
            if (!isBotAdmin) {
              await sock.sendMessage(from, { text: '❌ Bot harus menjadi admin untuk melakukan ini!' });
              return;
            }
            
            if (!isAdmin && !isOwner(sender)) {
              await sock.sendMessage(from, { text: '❌ Kamu harus menjadi admin untuk melakukan ini!' });
              return;
            }

            const user = message.message.extendedTextMessage?.contextInfo?.participant || messageContent.split(' ')[1]?.replace('@', '') + '@s.whatsapp.net';
            
            try {
              await sock.groupParticipantsUpdate(from, [user], 'promote');
              await sock.sendMessage(from, { text: '✅ Berhasil menjadikan admin grup!' });
            } catch (error) {
              await sock.sendMessage(from, { text: '❌ Gagal menjadikan admin grup!' });
            }
          }

          // Handle /demote command (admin/owner only)
          if (messageContent.startsWith('/demote ')) {
            if (!isGroup) {
              await sock.sendMessage(from, { text: '❌ Perintah ini hanya dapat digunakan di grup!' });
              return;
            }
            
            const groupMetadata = await sock.groupMetadata(from);
            const botNumber = sock.user.id.split(':')[0];
            const isBotAdmin = groupMetadata.participants.find(p => p.id.split('@')[0] === botNumber && p.admin);
            const isAdmin = groupMetadata.participants.find(p => p.id === participant && p.admin);
            
            if (!isBotAdmin) {
              await sock.sendMessage(from, { text: '❌ Bot harus menjadi admin untuk melakukan ini!' });
              return;
            }
            
            if (!isAdmin && !isOwner(sender)) {
              await sock.sendMessage(from, { text: '❌ Kamu harus menjadi admin untuk melakukan ini!' });
              return;
            }

            const user = message.message.extendedTextMessage?.contextInfo?.participant || messageContent.split(' ')[1]?.replace('@', '') + '@s.whatsapp.net';
            
            try {
              await sock.groupParticipantsUpdate(from, [user], 'demote');
              await sock.sendMessage(from, { text: '✅ Berhasil menghapus admin!' });
            } catch (error) {
              await sock.sendMessage(from, { text: '❌ Gagal menghapus admin!' });
            }
          }

          // Handle /kick command (admin/owner only)
          if (messageContent.startsWith('/kick ')) {
            if (!isGroup) {
              await sock.sendMessage(from, { text: '❌ Perintah ini hanya dapat digunakan di grup!' });
              return;
            }
            
            const groupMetadata = await sock.groupMetadata(from);
            const botNumber = sock.user.id.split(':')[0];
            const isBotAdmin = groupMetadata.participants.find(p => p.id.split('@')[0] === botNumber && p.admin);
            const isAdmin = groupMetadata.participants.find(p => p.id === participant && p.admin);
            
            if (!isBotAdmin) {
              await sock.sendMessage(from, { text: '❌ Bot harus menjadi admin untuk melakukan ini!' });
              return;
            }
            
            if (!isAdmin && !isOwner(sender)) {
              await sock.sendMessage(from, { text: '❌ Kamu harus menjadi admin untuk melakukan ini!' });
              return;
            }

            const user = message.message.extendedTextMessage?.contextInfo?.participant || messageContent.split(' ')[1]?.replace('@', '') + '@s.whatsapp.net';
            
            try {
              await sock.groupParticipantsUpdate(from, [user], 'remove');
              await sock.sendMessage(from, { text: '✅ Berhasil mengeluarkan member!' });
            } catch (error) {
              await sock.sendMessage(from, { text: '❌ Gagal mengeluarkan member!' });
            }
          }

          // Handle /add command (admin/owner only)
          if (messageContent.startsWith('/add ')) {
            if (!isGroup) {
              await sock.sendMessage(from, { text: '❌ Perintah ini hanya dapat digunakan di grup!' });
              return;
            }
            
            const groupMetadata = await sock.groupMetadata(from);
            const botNumber = sock.user.id.split(':')[0];
            const isBotAdmin = groupMetadata.participants.find(p => p.id.split('@')[0] === botNumber && p.admin);
            const isAdmin = groupMetadata.participants.find(p => p.id === participant && p.admin);
            
            if (!isBotAdmin) {
              await sock.sendMessage(from, { text: '❌ Bot harus menjadi admin untuk melakukan ini!' });
              return;
            }
            
            if (!isAdmin && !isOwner(sender)) {
              await sock.sendMessage(from, { text: '❌ Kamu harus menjadi admin untuk melakukan ini!' });
              return;
            }

            const number = messageContent.split(' ')[1];
            if (!number) {
              await sock.sendMessage(from, { text: '❌ Format salah! Gunakan: /add 62812345xxxx' });
              return;
            }

            const formattedNumber = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            
            try {
              await sock.groupParticipantsUpdate(from, [formattedNumber], 'add');
              await sock.sendMessage(from, { text: '✅ Berhasil menambahkan member!' });
            } catch (error) {
              await sock.sendMessage(from, { text: '❌ Gagal menambahkan member! Pastikan nomor valid dan tidak privat.' });
            }
          }

          // Handle /linkgrup command (admin/owner only)
          if (messageContent === '/linkgrup') {
            if (!isGroup) {
              await sock.sendMessage(from, { text: '❌ Perintah ini hanya dapat digunakan di grup!' });
              return;
            }
            
            const groupMetadata = await sock.groupMetadata(from);
            const botNumber = sock.user.id.split(':')[0];
            const isBotAdmin = groupMetadata.participants.find(p => p.id.split('@')[0] === botNumber && p.admin);
            const isAdmin = groupMetadata.participants.find(p => p.id === participant && p.admin);
            
            if (!isBotAdmin) {
              await sock.sendMessage(from, { text: '❌ Bot harus menjadi admin untuk melakukan ini!' });
              return;
            }
            
            if (!isAdmin && !isOwner(sender)) {
              await sock.sendMessage(from, { text: '❌ Kamu harus menjadi admin untuk melakukan ini!' });
              return;
            }

            try {
              const code = await sock.groupInviteCode(from);
              await sock.sendMessage(from, { 
                text: `🔗 *Link Grup:*\nhttps://chat.whatsapp.com/${code}\n\n_Gunakan /revoke untuk mereset link_` 
              });
            } catch (error) {
              await sock.sendMessage(from, { text: '❌ Gagal mendapatkan link grup!' });
            }
          }

          // Handle /revoke command (admin/owner only)
          if (messageContent === '/revoke') {
            if (!isGroup) {
              await sock.sendMessage(from, { text: '❌ Perintah ini hanya dapat digunakan di grup!' });
              return;
            }
            
            const groupMetadata = await sock.groupMetadata(from);
            const botNumber = sock.user.id.split(':')[0];
            const isBotAdmin = groupMetadata.participants.find(p => p.id.split('@')[0] === botNumber && p.admin);
            const isAdmin = groupMetadata.participants.find(p => p.id === participant && p.admin);
            
            if (!isBotAdmin) {
              await sock.sendMessage(from, { text: '❌ Bot harus menjadi admin untuk melakukan ini!' });
              return;
            }
            
            if (!isAdmin && !isOwner(sender)) {
              await sock.sendMessage(from, { text: '❌ Kamu harus menjadi admin untuk melakukan ini!' });
              return;
            }

            try {
              await sock.groupRevokeInvite(from);
              const newCode = await sock.groupInviteCode(from);
              await sock.sendMessage(from, { 
                text: `✅ Link grup berhasil direset!\n\n🔗 *Link Baru:*\nhttps://chat.whatsapp.com/${newCode}` 
              });
            } catch (error) {
              await sock.sendMessage(from, { text: '❌ Gagal mereset link grup!' });
            }
          }

          // Handle /sticker command
          if (messageContent.startsWith('/sticker') || messageContent.startsWith('/s ')) {
            if (!message.message.imageMessage && !message.message.videoMessage) {
              await sock.sendMessage(from, { 
                text: '❌ Kirim/balas gambar atau video dengan caption /sticker' 
              });
              return;
            }

            console.log('\n━━━━━━━━━━ STICKER MAKER ━━━━━━━━━━');
            console.log('🎨 Memproses sticker...');

            try {
              const isVideo = !!message.message.videoMessage;
              const media = await downloadMedia(
                message.message,
                isVideo ? 'video/mp4' : 'image/jpeg'
              );
              const stickerPath = `${tmpdir()}/${Date.now()}.webp`;

              if (isVideo) {
                // Convert video to webp
                await new Promise((resolve, reject) => {
                  ffmpeg(media)
                    .inputOptions(['-t', '10']) // Max 10 detik
                    .complexFilter(['scale=512:512:force_original_aspect_ratio=increase,crop=512:512'])
                    .outputOptions(['-vcodec', 'libwebp', '-vf', 'fps=10', '-lossless', '1'])
                    .toFormat('webp')
                    .save(stickerPath)
                    .on('end', resolve)
                    .on('error', reject);
                });
              } else {
                // Convert image to webp
                await sharp(media)
                  .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                  })
                  .toFormat('webp')
                  .toFile(stickerPath);
              }

              await sock.sendMessage(from, { 
                sticker: { url: stickerPath }
              });

              console.log('✅ Berhasil membuat sticker!');
              
              // Cleanup
              fs.unlinkSync(media);
              fs.unlinkSync(stickerPath);
              
            } catch (error) {
              console.error('❌ Error:', error);
              await sock.sendMessage(from, { 
                text: '❌ Gagal membuat sticker!' 
              });
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          }

          // Handle /toimg command
          if (messageContent.startsWith('/toimg')) {
            const quotedMsg = message.message.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMsg?.stickerMessage) {
              await sock.sendMessage(from, { 
                text: '❌ Balas sticker dengan caption /toimg' 
              });
              return;
            }

            console.log('\n━━━━━━━━━━ STICKER TO IMAGE ━━━━━━━━━━');
            console.log('🖼️ Mengkonversi sticker ke gambar...');

            const tempFile = `${tmpdir()}/${Date.now()}.webp`;
            const outputFile = `${tmpdir()}/${Date.now()}.png`;

            try {
              // Download sticker
              const buffer = await downloadMediaMessage(
                {
                  message: {
                    stickerMessage: quotedMsg.stickerMessage
                  }
                },
                'buffer',
                {},
                {
                  logger: P({ level: 'silent' }),
                  reuploadRequest: sock.updateMediaMessage
                }
              );

              // Simpan sticker sebagai webp
              fs.writeFileSync(tempFile, buffer);

              // Konversi ke PNG
              await sharp(tempFile)
                .toFormat('png')
                .toFile(outputFile);

              // Baca file hasil konversi
              const imageBuffer = fs.readFileSync(outputFile);

              // Kirim sebagai gambar dengan buffer
              await sock.sendMessage(from, { 
                image: imageBuffer,
                caption: '✨ Sticker berhasil dikonversi ke gambar!'
              });

              console.log('✅ Berhasil mengkonversi ke gambar!');

            } catch (error) {
              console.error('❌ Error:', error);
              await sock.sendMessage(from, {
                text: '❌ Gagal mengkonversi sticker ke gambar!'
              });
            } finally {
              // Cleanup dengan delay
              setTimeout(() => {
                try {
                  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
                } catch (err) {
                  console.log('Info: Cleanup file temporary');
                }
              }, 3000);
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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

// Clear console dan tampilkan banner hanya sekali
console.clear();
console.log('🚀 ====================================');
console.log('    WHATSAPP PAIRING CODE GENERATOR    ');
console.log('====================================\n');
console.log('💡 Tool ini akan menghasilkan kode pairing untuk menghubungkan WhatsApp.\n');

startWhatsApp();

// Tambahkan error handler global
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});