// plugins/video.js - Download YouTube video at 360p
const { downloadVideo } = require('../lib/yt');
const fs = require('fs');

module.exports = {
    name: 'video',
    alias: ['yt360'],
    category: 'downloader',
    description: 'Download YouTube video at 360p',
    usage: `${process.env.PREFIX || '.'}video <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        if (!url) {
            await sock.sendMessage(jid, { text: `🎬 *VIDEO*\n\n❌ *Missing URL*` }, { quoted: msg });
            return;
        }
        const match = url.match(/(https?:\/\/[^\s]+)/);
        if (match) url = match[1];

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 Downloading 360p video...` });

        try {
            const video = await downloadVideo(url, '360p');
            const buffer = fs.readFileSync(video.path);
            await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption: 'KIRA X MD' });
            await sock.sendMessage(jid, { text: `✅ *Video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            fs.unlinkSync(video.path);
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ Failed.`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};