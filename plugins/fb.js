// plugins/fb.js - KIRA X MD (Facebook video downloader)
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'fb',
    alias: ['facebook'],
    category: 'downloader',
    description: 'Download Facebook videos',
    usage: `${process.env.PREFIX || '.'}fb <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const outputPath = path.join(tempDir, `fb_${Date.now()}.mp4`);

        const ytDlpPath = path.join(__dirname, '../yt-dlp.exe');
        const cookiePath = path.join(__dirname, '../cookies.txt');
        const cookieFlag = fs.existsSync(cookiePath) ? ` --cookies "${cookiePath}"` : '';
        const command = `"${ytDlpPath}" -f bestvideo+bestaudio --merge-output-format mp4 -o "${outputPath}" "${url}"${cookieFlag} --js-runtime node`;

        try {
            await execPromise(command, { timeout: 90000 });
            if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) throw new Error();

            const buffer = fs.readFileSync(outputPath);
            await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption: 'KIRA X MD' });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};