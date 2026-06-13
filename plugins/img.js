// plugins/img.js - KIRA X MD (Image search via Bing/RapidAPI)
const axios = require('axios');

module.exports = {
    name: 'img',
    alias: ['image'],
    category: 'search',
    description: 'Search and send images',
    usage: `${process.env.PREFIX || '.'}img <query> [count]`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let query = args.join(' ').trim();
        if (!query) {
            await sock.sendMessage(jid, { text: '❌ *Search term missing*' }, { quoted: msg });
            return;
        }

        let count = 5;
        const parts = query.split(' ');
        const last = parts[parts.length - 1];
        if (!isNaN(parseInt(last))) {
            count = Math.min(parseInt(last), 10);
            query = parts.slice(0, -1).join(' ');
        }

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 Searching ${count} images for "${query}"...` });

        try {
            const apiKey = process.env.RAPIDAPI_KEY;
            if (!apiKey) throw new Error('RAPIDAPI_KEY not set in .env');

            const options = {
                method: 'GET',
                url: 'https://bing-image-search1.p.rapidapi.com/images/search',
                params: { q: query, count: count },
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': 'bing-image-search1.p.rapidapi.com'
                }
            };
            const response = await axios.request(options);
            const results = response.data.value;
            if (!results || results.length === 0) throw new Error('No images found');

            let sent = 0;
            for (const item of results) {
                const imgUrl = item.contentUrl;
                try {
                    const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
                    const buffer = Buffer.from(imgRes.data);
                    await sock.sendMessage(jid, { image: buffer });
                    sent++;
                } catch (e) {
                    console.log(`Failed to send ${imgUrl}:`, e.message);
                }
            }
            await sock.sendMessage(jid, { text: `✅ Sent ${sent}/${count} images`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Image search error:", err);
            let errorMsg = '❌ Failed to fetch images. Try a different keyword.';
            if (err.response?.status === 401) errorMsg = '❌ Invalid RapidAPI key. Check .env';
            else if (err.response?.status === 429) errorMsg = '❌ Rate limit exceeded. Try again later.';
            await sock.sendMessage(jid, { text: errorMsg, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};