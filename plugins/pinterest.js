// plugins/pinterest.js - KIRA X MD (Pinterest downloader – silent, only reactions)
const primesave = require('primesave-dl');
const axios = require('axios');

module.exports = {
    name: 'pinterest',
    alias: ['pin', 'pindl'],
    category: 'downloader',
    description: 'Download Pinterest media (silent, only reactions)',
    usage: `${process.env.PREFIX || '.'}pinterest <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: `📌 *PINTEREST*\n\nMissing URL\nExample: .pinterest https://pin.it/xxxxx` }, { quoted: msg });
            return;
        }

        // Start reaction
        await sock.sendMessage(jid, { react: { text: "📌", key: msg.key } });

        try {
            const result = await primesave(url);
            if (!result.success || !result.options || result.options.length === 0) throw new Error('No media');

            const media = result.options[0];
            const mediaUrl = media.url;
            const isVideo = media.type === 'Video';

            const mediaRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000 });
            const mediaBuffer = Buffer.from(mediaRes.data);

            if (isVideo) {
                await sock.sendMessage(jid, { video: mediaBuffer, mimetype: 'video/mp4' });
            } else {
                await sock.sendMessage(jid, { image: mediaBuffer });
            }

            // Success reaction
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Pinterest error:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};