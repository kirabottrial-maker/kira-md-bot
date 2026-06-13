// plugins/song.js - Search and download audio from YouTube (first result)
const { searchYoutube, downloadAudio } = require('../lib/yt');
const fs = require('fs');

module.exports = {
    name: 'song',
    alias: ['audio', 'mp3'],
    category: 'downloader',
    description: 'Search YouTube and download audio',
    usage: `${process.env.PREFIX || '.'}song <query>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        if (!query) {
            await sock.sendMessage(jid, { text: `🎵 *SONG*\n\n❌ *Missing query*` }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 Searching & downloading...` });

        try {
            const results = await searchYoutube(query, 1);
            if (!results.length) throw new Error('No results');
            const video = results[0];
            await sock.sendMessage(jid, { text: `📥 Downloading *${video.title}*...`, edit: statusMsg.key });
            const audio = await downloadAudio(video.url);
            const buffer = fs.readFileSync(audio.path);
            await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false, caption: 'KIRA X MD' });
            await sock.sendMessage(jid, { text: `✅ *Audio sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            fs.unlinkSync(audio.path);
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ Something went wrong.`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};