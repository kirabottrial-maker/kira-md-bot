const axios = require('axios');

module.exports = {
    name: 'insta',
    alias: ['ig', 'igdl', 'instagram', 'reel'],
    category: 'downloader',
    description: 'Download Instagram reels/videos',
    usage: '.insta <URL>', // .env ഒഴിവാക്കി

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // റിപ്ലൈ മെസ്സേജിൽ നിന്നും ലിങ്ക് എടുക്കുന്ന ഭാഗം
        if (!url && quoted) {
            const rawText = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || quoted.videoMessage?.caption || "";
            const match = rawText.match(/https?:\/\/(www\.)?instagram\.com\/\S+/);
            // match ഒരു array ആയതുകൊണ്ട് match എന്ന് എടുക്കുന്നു (Fix)
            url = match ? match : "";
        }

        if (!url || !url.includes('instagram.com')) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid Instagram URL or reply to a valid link!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading Instagram media...*` });

        try {
            // API ലിങ്ക് നേരിട്ട് ഇവിടെ സെറ്റ് ചെയ്തിരിക്കുന്നു
            const instaApi = "https://jerrycoder.oggyapi.workers.dev/down/insta?url=";
            
            // Railway-ൽ ഹാങ് ആവാതിരിക്കാൻ 15 സെക്കൻഡ് Timeout ആഡ് ചെയ്തു
            const res = await axios.get(`${instaApi}${encodeURIComponent(url)}`, { timeout: 15000 });
            const apiData = res.data;
            
            // API-യിൽ നിന്ന് ലിങ്ക് കണ്ടെത്തുന്നു
            const result = apiData.result || apiData.data;
            let videoUrl = '';

            if (Array.isArray(result) && result.length > 0) {
                // Array ആണെങ്കിൽ ആദ്യത്തെ ഐറ്റം എടുക്കുന്നു
                videoUrl = result.url || result.download_url || result;
            } else if (typeof result === 'object') {
                videoUrl = result.url || result.download_url || result.video;
            } else {
                videoUrl = apiData.url || apiData.download_url;
            }

            if (!videoUrl) throw new Error('Media link not found');

            // വേഗതയ്ക്കായി നേരിട്ട് URL അയക്കുന്നു
            await sock.sendMessage(jid, { 
                video: { url: videoUrl }, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD INSTAGRAM DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Instagram media sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error('Insta Error:', err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ *Failed to download! Server might be busy.*`, edit: statusMsg.key });
        }
    }
};