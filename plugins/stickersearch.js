const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const webp = require("node-webpmux");
const axios = require("axios"); 

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
            const apiKey = "LIVDSRZULELA"; 
            const url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=5`;
            
            const res = await axios.get(url, { timeout: 15000 });
            const json = res.data;
            
            const item = json.results?.[0];
            if (!item) throw new Error("No GIFs found");

            // 🚨 FIX: Safe Navigation Operator ഉപയോഗിച്ച് എറർ ഒഴിവാക്കുന്നു
            const mediaUrl = item?.media?.[0]?.gif?.url || item?.media?.[0]?.mediumgif?.url || item?.media?.[0]?.tinygif?.url;

            if (!mediaUrl) throw new Error("Could not find usable media URL from Tenor.");

            const bufferRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 15000 });
            const buffer = Buffer.from(bufferRes.data);
            
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            const inputPath = path.join(tempDir, `ssearch_${Date.now()}.gif`);
            const outputPath = path.join(tempDir, `ssearch_${Date.now()}.webp`);
            fs.writeFileSync(inputPath, buffer);

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
            console.error("StickerSearch Error:", e.message);
            await sock.sendMessage(jid, { text: `❌ *Failed to fetch sticker. Try another word.*` }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};