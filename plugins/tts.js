module.exports = {
    name: "tts",
    alias: ["say", "voice"],
    category: "utility",
    description: "Text to Speech (Voice Note)",
    usage: `${process.env.PREFIX || '.'}tts <text>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let text = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!text && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
            text = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation;
        } else if (!text && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text) {
            text = msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage.text;
        }

        if (!text) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(jid, { text: "*_⚠️ Need text to convert!_*\n_Example: .tts Hello bro_" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            let lang = "en";
            if (/[\u0D00-\u0D7F]+/.test(text)) lang = "ml";
            
            const langMatch = text.match(/\{([a-z]{2})\}/);
            if (langMatch) {
                lang = langMatch;
                text = text.replace(langMatch, "").trim();
            }

            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
            
            // Using global native fetch instead of Axios
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = Buffer.from(arrayBuffer);

            // Send as Voice Note
            await sock.sendMessage(jid, { 
                audio: audioBuffer, 
                mimetype: "audio/mpeg", 
                ptt: true 
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error("TTS Error:", error.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};