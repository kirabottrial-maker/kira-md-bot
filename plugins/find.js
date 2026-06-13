// plugins/find.js – KIRA X MD (Song recognition using RapidAPI Shazam)
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

module.exports = {
    name: "find",
    alias: ["identify", "whatsong"],
    category: "media",
    description: "Identify song from replied audio/video",
    usage: `${process.env.PREFIX || '.'}find`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "🎵", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: "🔍 *Identifying song...*" });

        let tempFile = null;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            tempFile = path.join(tempDir, `song_${Date.now()}.mp3`);
            fs.writeFileSync(tempFile, buffer);

            const apiKey = process.env.RAPIDAPI_KEY;
            if (!apiKey) throw new Error("RAPIDAPI_KEY not set in .env");

            const form = new FormData();
            form.append("file", fs.createReadStream(tempFile));

            const response = await fetch("https://shazam.p.rapidapi.com/songs/detect", {
                method: "POST",
                headers: {
                    "x-rapidapi-key": apiKey,
                    "x-rapidapi-host": "shazam.p.rapidapi.com",
                    ...form.getHeaders()
                },
                body: form
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (!data || !data.track || !data.track.title) {
                throw new Error("No song identified");
            }

            const title = data.track.title;
            const artist = data.track.subtitle;
            const coverArt = data.track.images?.coverarthq || "https://via.placeholder.com/300";

            const caption = `🎵 *SONG IDENTIFIED* 🎵

📀 *Title* : ${title}
🎤 *Artist* : ${artist}
━━━━━━━━━━━━━━━━━━━
🔹 *KIRA X MD* 🔹`;

            await sock.sendMessage(jid, { image: { url: coverArt }, caption });
            await sock.sendMessage(jid, { text: "✅ *Song found*", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Find error:", err);
            await sock.sendMessage(jid, { text: "❌ *Could not identify the song*", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
    }
};