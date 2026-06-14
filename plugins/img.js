module.exports = {
    name: 'img',
    alias: ['image'],
    category: 'search',
    description: 'Search and send top 5 relevant images (Safe Search)',
    usage: `${process.env.PREFIX || '.'}img <query>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();
        
        if (!query) return await sock.sendMessage(jid, { text: '❌ *Search term missing*' });

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

        try {
            // നിന്റെ API Key ഇവിടെ കൊടുത്തു
            const apiKey = '7b13fc759f637422a4fbad70a966323a4350c6dd8cc16a7cd24f7ab61fa7f9f5';
            const url = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&safe=active&api_key=${apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            // SerpApi-യിൽ 'images_results' ആണ് ഡാറ്റ വരുന്നത്
            const results = data.images_results ? data.images_results.slice(0, 5) : [];

            if (results.length === 0) throw new Error('No images found');

            for (const item of results) {
                // 'original' ലിങ്ക് ചിലപ്പോൾ ബ്ലോക്ക് ആയിരിക്കും, അതുകൊണ്ട് 'thumbnail' അല്ലെങ്കിൽ 'original' ട്രൈ ചെയ്യാം
                const imgUrl = item.original || item.thumbnail;
                const imgRes = await fetch(imgUrl);
                const buffer = Buffer.from(await imgRes.arrayBuffer());
                
                await sock.sendMessage(jid, { image: buffer, caption: `✅ *Result for: ${query}*` });
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Image search error:", err);
            await sock.sendMessage(jid, { text: '❌ Failed to fetch images.', react: { text: "❌", key: msg.key } });
        }
    }
};