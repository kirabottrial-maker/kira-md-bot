const axios = require('axios');

module.exports = {
    name: 'fb',
    alias: ['facebook', 'fbdl'],
    category: 'downloader',
    description: 'Download Facebook videos',
    usage: '.fb <URL>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url || (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.gg'))) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid Facebook URL!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading Facebook video...*` });

        try {
            // API ലിങ്ക് നേരിട്ട് ഇവിടെ സെറ്റ് ചെയ്തിരിക്കുന്നു
            const fbApi = "https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=";
            
            // Railway-ൽ ഹാങ് ആവാതിരിക്കാൻ Timeout (15 seconds) ആഡ് ചെയ്തു
            const res = await axios.get(`${fbApi}${encodeURIComponent(url)}`, { timeout: 15000 });
            const apiData = res.data;
            
            const result = apiData.data || apiData.result;
            const videoUrl = result?.high || result?.hd || result?.url || result?.video || result?.sd;

            if (!videoUrl) throw new Error('Video link not found');

            await sock.sendMessage(jid, { 
                video: { url: videoUrl }, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD FACEBOOK DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            // Edit message syntax Railway-യിൽ കൃത്യമായി വർക്ക് ചെയ്യാൻ
            await sock.sendMessage(jid, { text: `✅ *Facebook video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error('FB Error:', err.message);
            await sock.sendMessage(jid, { text: `❌ *Failed to download! Server busy.*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};