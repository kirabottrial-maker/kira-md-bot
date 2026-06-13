// plugins/menu.js - KIRA X MD (Premium categorized menu)
module.exports = {
    name: 'menu',
    alias: ['help', 'commands', 'dashboard'],
    category: 'utility',
    description: 'Show premium bot dashboard with all commands',
    usage: `${process.env.PREFIX || '.'}menu`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prefix = process.env.PREFIX || '.';
        const commands = global.commands || [];

        const userName = msg.pushName || 'User';
        const userJid = (msg.key.participant || jid).split('@')[0];
        const botName = process.env.BOT_NAME || 'KIRA X MD';
        const ownerName = process.env.OWNER_NAME || 'Madhav';
        const mode = process.env.MODE === 'private' ? '👑 Private' : '🌍 Public';
        const platform = `Node.js ${process.version}`;
        const totalCmds = commands.length;
        const uptime = global.startTime ? formatUptime(Date.now() - global.startTime) : 'Just started';

        // Group commands by category
        const categories = {};
        for (const cmd of commands) {
            if (cmd.name === 'menu') continue; // skip itself
            const cat = cmd.category || '📦 Utility';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd.name);
        }

        // Order categories nicely
        const orderedCategories = [
            '🤖 AI', '📥 Downloader', '🎬 Media', '🔍 Search',
            '🛠️ Utility', '🎮 Fun', '🎨 Sticker', '👑 Owner',
            '👥 Group', '📦 Utility'
        ];
        const sortedCats = Object.keys(categories).sort((a,b) => {
            const idxA = orderedCategories.indexOf(a);
            const idxB = orderedCategories.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        // Build the dashboard header
        const header = `╔══════════════════════╗
║ ✨ *${botName}* ✨
╚══════════════════════╝

▫️ *User* : ${userName}
▫️ *JID*  : ${userJid}

▫️ *Mode*      : ${mode}
▫️ *Owner*     : ${ownerName}
▫️ *Platform*  : ${platform}
▫️ *Commands*  : ${totalCmds}
▫️ *Uptime*    : ${uptime}

━━━━━━━━━━━━━━━━━━━━━━━
📜 *COMMAND LIST*
`;

        // Build command sections
        let menuText = header;
        for (const cat of sortedCats) {
            const cmdNames = categories[cat].sort();
            menuText += `\n◆ *${cat}* ◆\n`;
            for (const name of cmdNames) {
                menuText += `   ${prefix}${name}\n`;
            }
        }

        menuText += `\n━━━━━━━━━━━━━━━━━━━━━━━\n🔹 *${botName}* 🔹`;

        // Split if too long (WhatsApp ~4000 chars)
        if (menuText.length > 3900) {
            const parts = menuText.match(/[\s\S]{1,3800}/g) || [];
            for (let i = 0; i < parts.length; i++) {
                if (i === 0) {
                    await sock.sendMessage(jid, { image: { url: 'https://i.ibb.co/FkYcVmw5/temp.jpg' }, caption: parts[i] }, { quoted: msg });
                } else {
                    await sock.sendMessage(jid, { text: parts[i] });
                }
            }
        } else {
            await sock.sendMessage(jid, { image: { url: 'https://i.ibb.co/FkYcVmw5/temp.jpg' }, caption: menuText }, { quoted: msg });
        }
    }
};

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}