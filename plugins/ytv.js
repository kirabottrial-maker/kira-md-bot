const axios = require('axios');

module.exports = {
    name: 'ytv',
    alias: ['ytvideo'],
    category: 'downloader',
    description: 'Download YouTube video (Stable Multi-API)',
    usage: '.ytv <URL>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!url && quoted) {
            const getRawText = (q) => q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || "";
            let rawText = getRawText(quoted);
            if (!rawText && quoted.extendedTextMessage?.contextInfo?.quotedMessage) {
                rawText = getRawText(quoted.extendedTextMessage.contextInfo.quotedMessage);
            }
            const match = rawText.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (match) url = `https://youtu.be/${match}`;
        }

        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            return await sock.sendMessage(jid, { text: `❌ *Please provide a valid YouTube URL!*` }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        let statusMsg = await sock.sendMessage(jid, { text: `📥 *Bypassing server blocks...*` });

        try {
            let videoUrl = '';

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp4-v1?url=${encodeURIComponent(url)}`,
                `https://api-aswin-sparky.koyeb.app/api/downloader/ytv?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp4?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytmp4?url=${encodeURIComponent(url)}` 
            ];

            // 🚨 ബ്രൗസറിനെപ്പോലെ അഭിനയിക്കാൻ ഇത് നിർബന്ധമാണ് 🚨
            const axiosConfig = {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://google.com/'
                }
            };

            for (let i = 0; i < apis.length; i++) {
                try {
                    const res = await axios.get(apis[i], axiosConfig);
                    const data = res.data;
                    
                    if (data.data && data.data.dl) videoUrl = data.data.dl; 
                    else if (data.data && data.data.url) videoUrl = data.data.url; 
                    else if (data.url) videoUrl = data.url; 
                    else if (data.result && (data.result.download_url || data.result.url || data.result.video || data.result.hd)) {
                        videoUrl = data.result.download_url || data.result.url || data.result.video || data.result.hd;
                    }

                    if (videoUrl && videoUrl.startsWith('http')) {
                        break; 
                    }
                } catch (e) {
                    console.log(`API ${i+1} failed/blocked. Trying next...`);
                }
            }

            if (!videoUrl) throw new Error('Railway IP blocked by all servers.');

            await sock.sendMessage(jid, { text: `📥 *Downloading video...*`, edit: statusMsg.key });

            // ഡൗൺലോഡ് ചെയ്യുന്ന സമയത്തും ബ്രൗസർ ഹെഡർ വേണം
            await sock.sendMessage(jid, { 
                video: { url: videoUrl }, 
                mimetype: 'video/mp4', 
                caption: `*🎌 KIRA X MD YTV DOWNLOADER 🎌*` 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("YTV Downloader Error:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ *Railway IP issue: Try again later!*`, edit: statusMsg.key });
        }
    }
};