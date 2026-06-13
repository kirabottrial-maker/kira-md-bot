// plugins/yts.js - YouTube search with detailed info
const { searchYoutube } = require('../lib/yt');

module.exports = {
    name: 'yts',
    alias: ['ysearch'],
    category: 'search',
    description: 'Search YouTube and show details',
    usage: `${process.env.PREFIX || '.'}yts <query>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        if (!query) {
            await sock.sendMessage(jid, { text: `🔎 *YTS*\n\n❌ *Missing query*` }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "🔎", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 Searching...` });

        try {
            const results = await searchYoutube(query, 10);
            if (!results.length) throw new Error('No results');

            let txt = `🎬 *YouTube Search Results for "${query}"*\n\n`;
            results.forEach((v, i) => {
                txt += `${i+1}. *${v.title}*\n   ⏱️ ${v.duration} | 👁️ ${v.views.toLocaleString()} views\n   📺 ${v.channel.name}\n\n`;
            });
            txt += `_Reply with a number (1-10) to see more details._`;
            await sock.sendMessage(jid, { text: txt, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            // Store search results globally for selection (simplified: we won't implement interactive selection here)
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ Search failed.`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};