// plugins/spotify.js - Download Spotify track via YouTube search
const { searchYoutube, downloadAudio } = require('../lib/yt');
const fs = require('fs');
const axios = require('axios');

async function getSpotifyTrackInfo(url) {
    // Use a public API to fetch track info (no key required)
    const apiUrl = `https://spotify-downloader9.p.rapidapi.com/downloadTrack?id=${url.split('/track/')[1]}`;
    // Since we don't have RapidAPI key for this, we'll use a simpler method: extract title from page or use regex.
    // For simplicity, we'll use a public endpoint that returns JSON.
    // Actually, we can use the Spotify oembed endpoint.
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await axios.get(oembedUrl);
    const title = response.data.title; // format: "Song Title - Artist Name"
    const [song, artist] = title.split(' - ');
    return { title: song, artist };
}

module.exports = {
    name: 'spotify',
    alias: ['sp'],
    category: 'downloader',
    description: 'Download audio from Spotify link',
    usage: `${process.env.PREFIX || '.'}spotify <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        if (!url) {
            await sock.sendMessage(jid, { text: `🎵 *SPOTIFY*\n\n❌ *Missing URL*` }, { quoted: msg });
            return;
        }
        const match = url.match(/(https?:\/\/[^\s]+)/);
        if (match) url = match[1];
        if (!url.includes('spotify.com')) {
            await sock.sendMessage(jid, { text: `❌ *Invalid Spotify URL*` }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "🎵", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 Fetching Spotify info...` });

        try {
            // Get track info
            const trackId = url.split('/track/')[1]?.split('?')[0];
            if (!trackId) throw new Error('Invalid track URL');
            const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
            const oembedRes = await axios.get(oembedUrl);
            const fullTitle = oembedRes.data.title; // "Song Title - Artist Name"
            const [title, artist] = fullTitle.split(' - ');
            const searchQuery = `${title} ${artist}`;
            await sock.sendMessage(jid, { text: `🔍 Searching YouTube for *${fullTitle}*...`, edit: statusMsg.key });
            const results = await searchYoutube(searchQuery, 1);
            if (!results.length) throw new Error('No match on YouTube');
            const video = results[0];
            await sock.sendMessage(jid, { text: `📥 Downloading *${video.title}*...`, edit: statusMsg.key });
            const audio = await downloadAudio(video.url);
            const buffer = fs.readFileSync(audio.path);
            await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false, caption: 'KIRA X MD' });
            await sock.sendMessage(jid, { text: `✅ *Audio sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            fs.unlinkSync(audio.path);
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ Failed.`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};