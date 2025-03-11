const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

module.exports = {
    getGithubInfo,
    getRepoList
}; 