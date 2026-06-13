module.exports = {
    name: 'anime',
    alias: ['searchanime'],
    category: 'anime',
    description: 'Search anime info from MyAnimeList',
    usage: `${process.env.PREFIX || '.'}anime <anime name>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            await sock.sendMessage(jid, { text: `*📺 ANIME SEARCH*\n\n❌ *Missing anime name*\n➤ Example: ${process.env.PREFIX || '.'}anime Naruto` }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const searchUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&sfw&limit=1`;
            const response = await fetch(searchUrl);
            const result = await response.json();
            
            // ഇവിടെയാണ് മാറ്റം: result.data ഉണ്ടോ എന്ന് കൃത്യമായി ചെക്ക് ചെയ്യുന്നു
            if (!result.data || result.data.length === 0) {
                await sock.sendMessage(jid, { text: `*📺 ANIME SEARCH*\n\n❌ *No anime found*` });
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return;
            }

            const anime = result.data[0];

            // കൃത്യമായ ഡാറ്റാ ഫീൽഡുകൾ ഉപയോഗിക്കുന്നു
            const title = anime.title || 'Unknown';
            const eng = anime.title_english || 'N/A';
            const eps = anime.episodes || 'Unknown';
            const status = anime.status || 'Unknown';
            const score = anime.score || 'N/A';
            const rank = anime.rank || 'N/A';
            const pop = anime.popularity || 'N/A';
            const members = anime.members ? anime.members.toLocaleString() : 'N/A';
            const genres = anime.genres ? anime.genres.map(g => g.name).join(', ') : 'N/A';
            const syno = anime.synopsis ? anime.synopsis.substring(0, 250) + '...' : 'No synopsis.';
            const url = anime.url || 'https://myanimelist.net';
            const imgUrl = anime.images?.jpg?.large_image_url || '';

            const premiumMessage = `🎌 *KIRA ANIME INFO* 🎌

📖 *Title* : ${title}
🌐 *English Title* : ${eng}
📺 *Episodes* : ${eps}
⚡ *Status* : ${status}
⭐ *Score* : ${score} / 10
🎖️ *Ranked* : #${rank}
🔥 *Popularity* : #${pop}
👥 *Members* : ${members}
🎭 *Genres* : ${genres}

📝 *Synopsis* :
${syno}

🔗 *MAL Link* : ${url}

━━━━━━━━━━━━━━━━━━━`;

            if (imgUrl) {
                const imgRes = await fetch(imgUrl);
                const imgBuff = Buffer.from(await imgRes.arrayBuffer());
                await sock.sendMessage(jid, { image: imgBuff, caption: premiumMessage }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, { text: premiumMessage }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('Anime search error:', error);
            await sock.sendMessage(jid, { text: `*📺 ANIME SEARCH*\n\n❌ Error occurred!` });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};