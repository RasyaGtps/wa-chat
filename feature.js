const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Tambahkan variabel untuk menyimpan waktu mulai
let startTime = Date.now();

// Fungsi untuk format durasi
function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days} hari`);
    if (hours > 0) parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);
    if (seconds > 0) parts.push(`${seconds} detik`);

    return parts.join(', ');
}

// Fungsi untuk mendapatkan uptime
function getUptime() {
    const uptime = Date.now() - startTime;
    const formattedUptime = formatDuration(uptime);
    
    const message = `🤖 *Status Bot*\n\n` +
                   `⏰ Uptime: ${formattedUptime}\n` +
                   `🚀 Aktif sejak: ${new Date(startTime).toLocaleString('id-ID')}\n` +
                   `💻 Platform: ${process.platform}\n` +
                   `🔋 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`;
    
    return message;
}

// Reset waktu mulai (panggil saat bot restart)
function resetUptime() {
    startTime = Date.now();
    console.log('⏰ Uptime direset!');
}

async function downloadImage(url, username) {
    console.log(`📥 Mengunduh foto profil untuk @${username}...`);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer'
    });
    
    const buffer = Buffer.from(response.data, 'binary');
    const imagePath = path.join(__dirname, `${username}.jpg`);
    fs.writeFileSync(imagePath, buffer);
    console.log('✅ Foto profil berhasil diunduh!');
    
    return imagePath;
}

async function getGithubInfo(username) {
    try {
        console.log(`\n🔍 Mencari informasi untuk user GitHub: @${username}...`);
        const response = await axios.get(`https://api.github.com/users/${username}`);
        const user = response.data;
        console.log('✅ Informasi user GitHub ditemukan!');
        
        // Format bio dengan mengganti newline dengan \n
        const formattedBio = user.bio ? user.bio.replace(/\r\n|\r|\n/g, '\n') : 'Tidak tersedia';
        
        // Format pesan dengan emoji
        const caption = `🔍 *Info GitHub untuk @${user.login}*\n\n` +
            `👤 Nama: ${user.name || 'Tidak tersedia'}\n` +
            `📝 Bio:\n${formattedBio}\n\n` +
            `👥 Followers: ${user.followers}\n` +
            `👣 Following: ${user.following}\n` +
            `📚 Public Repos: ${user.public_repos}\n` +
            `🌐 URL: ${user.html_url}`;
            
        // Download image first
        const imagePath = await downloadImage(user.avatar_url, username);
        console.log('📤 Menyiapkan pesan...\n');
            
        // Return object containing both image path and caption
        return {
            imagePath: imagePath,
            caption: caption
        };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log('❌ User GitHub tidak ditemukan!');
            throw new Error('User GitHub tidak ditemukan!');
        }
        console.error('❌ Error:', error);
        throw new Error('Terjadi kesalahan saat mengambil info GitHub');
    }
}

async function getRepoList(username) {
    try {
        console.log(`\n🔍 Mencari repository untuk user GitHub: @${username}...`);
        const response = await axios.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`);
        const repos = response.data;
        console.log('✅ Daftar repository ditemukan!');
        
        if (repos.length === 0) {
            throw new Error('User tidak memiliki repository publik.');
        }
        
        // Format pesan dengan emoji
        let repoList = `📚 *Repository GitHub @${username}*\n` +
                      `💫 Menampilkan ${Math.min(repos.length, 10)} repository terbaru\n\n`;
        
        repos.forEach((repo, index) => {
            const stars = repo.stargazers_count;
            const forks = repo.forks_count;
            const lastUpdate = new Date(repo.updated_at).toLocaleString();
            
            repoList += `${index + 1}. *${repo.name}*\n` +
                       `   ├ 📝 ${repo.description || 'Tidak ada deskripsi'}\n` +
                       `   ├ ⭐ Stars: ${stars}\n` +
                       `   ├ 🔄 Forks: ${forks}\n` +
                       `   ├ 📅 Updated: ${lastUpdate}\n` +
                       `   └ 🔗 ${repo.html_url}\n\n`;
        });
            
        return repoList;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new Error('User GitHub tidak ditemukan!');
        }
        throw new Error('Terjadi kesalahan saat mengambil daftar repository');
    }
}

async function getFollowers(username) {
    try {
        console.log(`\n🔍 Mencari daftar followers untuk user GitHub: @${username}...`);
        const response = await axios.get(`https://api.github.com/users/${username}/followers?per_page=100`);
        const followers = response.data;
        console.log('✅ Daftar followers ditemukan!');
        
        if (followers.length === 0) {
            throw new Error('User tidak memiliki followers.');
        }
        
        // Format pesan dengan emoji
        let followerList = `👥 *Daftar Followers @${username}*\n` +
                          `📊 Total Followers: ${followers.length}\n\n`;
        
        followers.forEach((follower, index) => {
            followerList += `${index + 1}. *${follower.login}*\n` +
                          `   ├ 🔗 Profile: ${follower.html_url}\n` +
                          `   └ 🖼️ Avatar: ${follower.avatar_url}\n\n`;
        });
        
        // Tambahkan catatan jika ada lebih banyak followers
        if (followers.length === 100) {
            followerList += '\n📝 *Catatan: Hanya menampilkan 100 followers teratas.*';
        }
            
        return followerList;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new Error('User GitHub tidak ditemukan!');
        }
        throw new Error('Terjadi kesalahan saat mengambil daftar followers');
    }
}

async function getFollowing(username) {
    try {
        console.log(`\n🔍 Mencari daftar following untuk user GitHub: @${username}...`);
        const response = await axios.get(`https://api.github.com/users/${username}/following?per_page=100`);
        const following = response.data;
        console.log('✅ Daftar following ditemukan!');
        
        if (following.length === 0) {
            throw new Error('User tidak following siapapun.');
        }
        
        // Format pesan dengan emoji
        let followingList = `👣 *Daftar Following @${username}*\n` +
                          `📊 Total Following: ${following.length}\n\n`;
        
        following.forEach((follow, index) => {
            followingList += `${index + 1}. *${follow.login}*\n` +
                           `   ├ 🔗 Profile: ${follow.html_url}\n` +
                           `   └ 🖼️ Avatar: ${follow.avatar_url}\n\n`;
        });
        
        // Tambahkan catatan jika ada lebih banyak following
        if (following.length === 100) {
            followingList += '\n📝 *Catatan: Hanya menampilkan 100 following teratas.*';
        }
            
        return followingList;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new Error('User GitHub tidak ditemukan!');
        }
        throw new Error('Terjadi kesalahan saat mengambil daftar following');
    }
}

module.exports = {
    getGithubInfo,
    getRepoList,
    getUptime,
    resetUptime,
    getFollowers,
    getFollowing
}; 