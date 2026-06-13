const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const webp = require("node-webpmux");

const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);

async function addMetadata(webpFilePath, packName, authorName) {
    try {
        const img = new webp.Image();
        await img.load(webpFilePath);
        const exif = {
            "sticker-pack-id": "kira-x-md-sticker",
            "sticker-pack-name": packName,
            "sticker-author-name": authorName,
            "emojis": ["🔎", "✨"]
        };
        const jsonBuff = Buffer.from(JSON.stringify(exif), "utf-8");
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const finalExif = Buffer.concat([exifAttr, jsonBuff]);
        finalExif.writeUIntLE(jsonBuff.length, 14, 4);
        img.exif = finalExif;
        await img.save(webpFilePath);
    } catch (e) { console.error(e); }
}

module.exports = {
    name: "stickersearch",
    alias: ["ssearch"],
    category: "sticker",
    execute: async (sock, msg, args) => {
        const jid = msg.key.remoteJid;
        const query = (args || []).join(' ');
        if (!query) return await sock.sendMessage(jid, { text: "⚠️ *Need a search term!*" }, { quoted: msg });
        
        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

        try {
            const url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=5`;
            const res = await fetch(url);
            const json = await res.json();
            
            // 🛑 അഡ്വാൻസ്ഡ് URL എക്സ്ട്രാക്ഷൻ (Undefined എറർ വരില്ല)
            const item = json.results[0];
            const media = item.media[0];
            const mediaUrl = media.gif?.url || media.mediumgif?.url || media.tinygif?.url;

            if (!mediaUrl) throw new Error("Could not find usable media URL");

            const buffer = Buffer.from(await (await fetch(mediaUrl)).arrayBuffer());
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
            
            const inputPath = path.join(tempDir, `ssearch_${Date.now()}.gif`);
            const outputPath = path.join(tempDir, `ssearch_${Date.now()}.webp`);
            fs.writeFileSync(inputPath, buffer);

            // FFmpeg എറർ ഒഴിവാക്കാൻ കൂടുതൽ സ്പെസിഫിക് ആയ കമാൻഡ്
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .outputOptions([
                        "-vcodec libwebp",
                        "-vf scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=black@0",
                        "-loop 0",
                        "-preset default",
                        "-an",
                        "-vsync 0",
                        "-s 512x512"
                    ])
                    .toFormat("webp")
                    .on("error", reject)
                    .on("end", resolve)
                    .save(outputPath);
            });

            await addMetadata(outputPath, "KIRA X MD", "Kira");
            await sock.sendMessage(jid, { sticker: fs.readFileSync(outputPath) });
            
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
            console.log("StickerSearch Error:", e);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};