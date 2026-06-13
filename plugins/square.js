const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "square",
    category: "media",
    description: "Crop image/video to 1:1 square",
    usage: `${process.env.PREFIX || '.'}square (reply to image/video)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const isVideo = !!quoted.videoMessage;
            const ext = isVideo ? 'mp4' : 'jpg';
            inputPath = path.join(tempDir, `square_in_${Date.now()}.${ext}`);
            outputPath = path.join(tempDir, `square_out_${Date.now()}.${ext}`);
            fs.writeFileSync(inputPath, buffer);

            if (isVideo) {
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .videoFilter("crop=min(iw,ih):min(iw,ih)")
                        .outputOptions(["-c:v libx264", "-preset fast", "-crf 23", "-c:a copy"])
                        .output(outputPath)
                        .on("end", resolve)
                        .on("error", reject)
                        .run();
                });
                const videoBuffer = fs.readFileSync(outputPath);
                await sock.sendMessage(jid, { video: videoBuffer, mimetype: 'video/mp4', caption: "KIRA X MD" });
            } else {
                await sharp(inputPath)
                    .resize(512, 512, { fit: "cover" })
                    .toFile(outputPath);
                const imgBuffer = fs.readFileSync(outputPath);
                await sock.sendMessage(jid, { image: imgBuffer, caption: "KIRA X MD" });
            }
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            try {
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {}
        }
    }
};