const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "upload",
    alias: ["dlurl"],
    category: "utility",
    description: "Download file from URL and send as document",
    usage: `${process.env.PREFIX || '.'}upload <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        if (!url) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return;
        }
        const match = url.match(/https?:\/\/[^\s]+/);
        if (match) url = match[0];

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });

        let outputPath;
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const ext = path.extname(url) || '.bin';
            outputPath = path.join(tempDir, `upload_${Date.now()}${ext}`);
            fs.writeFileSync(outputPath, buffer);
            const fileName = path.basename(url) || `file${ext}`;
            await sock.sendMessage(jid, { document: fs.readFileSync(outputPath), mimetype: 'application/octet-stream', fileName });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};