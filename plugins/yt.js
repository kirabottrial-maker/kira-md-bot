const axios = require('axios');

module.exports = {
    name: 'yt',
    alias: ['youtube', 'ytdl'],
    category: 'downloader',
    description: 'Download YouTube videos',
    usage: '.yt <URL>', // .env ഒഴിവാക്കി

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!url && quoted) {
            const getRawText = (q) => {
                return q.conversation || 
                       q.extendedTextMessage?.text || 
                       q.imageMessage?.caption || 
                       q.videoMessage?.caption || 
                       q.buttonsMessage?.contentText || 
                       "";
            };

            let rawText = getRawText(quoted);

            if (!rawText && quoted.extendedTextMessage?.contextInfo?.quotedMessage) {
                rawText = getRawText(quoted.extendedTextMessage.contextInfo.quotedMessage);
            }

            const match = rawText.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (match) url = `https://youtu.be/${match}`;
        }

        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid YouTube URL or reply to a valid link!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        let statusMsg;

        try {
            statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading YouTube video...*` });

            // API വിളിക്കാൻ 15 സെക്കൻഡ് ടൈംഔട്ട്
            const apiUrl = `https://jerrycoder.oggyapi.workers.dev/down/youtube?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            
            const apiData = res.data;
            let videoUrl = '';

            if (apiData.result) {
                videoUrl = apiData.result.video || apiData.result.url || apiData.result.download_url || apiData.result.hd || (Array.isArray(apiData.result) ? apiData.result.url : '');
            } else if (apiData.data) {
                videoUrl = apiData.data.video || apiData.data.url || apiData.data.download_url || apiData.data.hd;
            } else if (apiData.url || apiData.video) {
                videoUrl = apiData.url || apiData.video;
            }

            if (!videoUrl) {
                throw new Error('Video link not found in API response');
            }

            // വലിയ വീഡിയോകൾ ഡൗൺലോഡ് ആവാൻ 20 സെക്കൻഡ് ടൈംഔട്ട് കൊടുത്തു
            const { data: buffer } = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 20000 });

            await sock.sendMessage(jid, { 
                video: buffer, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD YT DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error('YT Error:', err.message || err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            
            if (statusMsg && statusMsg.key) {
                await sock.sendMessage(jid, { text: `❌ *Failed to download! Server busy.*`, edit: statusMsg.key });
            } else {
                await sock.sendMessage(jid, { text: `❌ *Failed to download!*` }, { quoted: msg });
            }
        }
    }
};