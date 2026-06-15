const ytSearch = require('yt-search'); 
const axios = require('axios');

module.exports = {
    name: 'play',
    alias: ['song', 'music', 'audio'],
    category: 'downloader',
    description: 'Search and play YouTube audio or use direct link',
    usage: '.play <song name or link>',
    
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        
        if (!query) {
            return await sock.sendMessage(jid, { text: `❌ *What song do you want to play?*\nExample: .play Past Lives or .play <YouTube Link>` }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        let statusMsg = await sock.sendMessage(jid, { text: `🔍 *Searching for the song...*` });

        try {
            let url = '';
            
            const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            const match = query.match(ytRegex);

            if (match) {
                url = `https://youtu.be/${match[1]}`;
            } else {
                const searchResults = await ytSearch(query);
                const video = searchResults.videos ? searchResults.videos.find(v => v.url) : null;
                
                if (!video || !video.url) {
                    throw new Error('No valid video link found for your search.');
                }
                url = video.url;
            }

            await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
            await sock.sendMessage(jid, { text: `📥 *Bypassing server blocks to download audio...*`, edit: statusMsg.key });

            let audioUrl = '';

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`, 
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3?url=${encodeURIComponent(url)}`,    
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,              
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(url)}` 
            ];

            // 🚨 ബ്രൗസറിനെപ്പോലെ അഭിനയിക്കാൻ Anti-Block Headers 🚨
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
                    
                    if (data.data && data.data.dl) audioUrl = data.data.dl;
                    else if (data.url) audioUrl = data.url;
                    else if (data.result && (data.result.download_url || data.result.url || data.result.audio)) audioUrl = data.result.download_url || data.result.url || data.result.audio;
                    else if (data.audio) audioUrl = data.audio;
                    else if (typeof data.result === 'string') audioUrl = data.result;

                    if (audioUrl && audioUrl.startsWith('http')) {
                        break; 
                    }
                } catch (e) {
                    console.log(`Play API ${i+1} failed/blocked. Trying next...`);
                }
            }

            if (!audioUrl) {
                throw new Error('Railway IP blocked by all servers or servers are down.');
            }

            await sock.sendMessage(jid, { text: `✨ *Sending audio stream...*`, edit: statusMsg.key });

            await sock.sendMessage(jid, { 
                audio: { url: audioUrl }, 
                mimetype: 'audio/mpeg'
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Track sent successfully!*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "🎧", key: msg.key } });

        } catch (err) {
            console.error("Play Command Error:", err.message); 
            await sock.sendMessage(jid, { text: `❌ *Failed! Server block or busy.*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};