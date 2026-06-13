module.exports = {
    name: "gifsearch",
    alias: ["gif", "getgif"],
    category: "search",
    description: "Search and send GIFs",
    usage: `${process.env.PREFIX || '.'}gifsearch <query>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(jid, { text: "*_⚠️ Need a search term!_*\n_Example: .gif mr bean_" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

        try {
            const tenorKey = "LIVDSRZULELA";
            const url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${tenorKey}&limit=15`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error("API failed");
            
            const json = await response.json();
            if (!json.results || json.results.length === 0) {
                throw new Error("No GIFs found");
            }

            const randomResult = json.results[Math.floor(Math.random() * json.results.length)];
            
            // 🛑 THE AUTO-SCANNER FIX
            let mediaObj = randomResult.media ? randomResult.media[0] : randomResult.media_formats;
            if (!mediaObj) throw new Error("No media object found");

            let mediaUrl = null;
            
            // First, try to find an MP4 (Best for WhatsApp)
            for (let key in mediaObj) {
                if (key.includes('mp4') && mediaObj[key].url) {
                    mediaUrl = mediaObj[key].url;
                    break;
                }
            }
            
            // If no MP4, just grab the first available URL!
            if (!mediaUrl) {
                for (let key in mediaObj) {
                    if (mediaObj[key].url) {
                        mediaUrl = mediaObj[key].url;
                        break;
                    }
                }
            }

            if (!mediaUrl) throw new Error("Could not extract GIF URL");

            // Download & Send
            const mediaRes = await fetch(mediaUrl);
            const arrayBuffer = await mediaRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            await sock.sendMessage(jid, { 
                video: buffer, 
                gifPlayback: true,
                caption: `*_GIF: ${query}_*`
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("GIF Search error:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: `*_⚠️ Failed to find GIF for "${query}"._*` }, { quoted: msg });
        }
    }
};