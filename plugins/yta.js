// plugins/yta.js - Download audio as document
const { downloadAudio } = require('../lib/yt');
const fs = require('fs');

module.exports = {
    name: 'yta',
    alias: ['ytaudio'],
    category: 'downloader',
    description: 'Download YouTube audio as document',
    usage: `${process.env.PREFIX || '.'}yta <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        if (!url) {
            await sock.sendMessage(jid, { text: `🎵 *YTA*\n\n❌ *Missing URL*` }, { quoted: msg });
            return;
        }
        const match = url.match(/(https?:\/\/[^\s]+)/);
        if (match) url = match[1];

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 Downloading audio...` });

        try {
            const audio = await downloadAudio(url);
            const buffer = fs.readFileSync(audio.path);
            await sock.sendMessage(jid, { document: buffer, mimetype: 'audio/mpeg', fileName: `${audio.title}.mp3`, caption: 'KIRA X MD' });
            await sock.sendMessage(jid, { text: `✅ *Audio sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            fs.unlinkSync(audio.path);
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ Failed.`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};