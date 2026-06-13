// plugins/menu.js - KIRA X MD (Premium dashboard menu)
module.exports = {
    name: 'menu',
    alias: ['help', 'commands', 'dashboard'],
    category: 'utility',
    description: 'Show bot dashboard with command list',
    usage: `${process.env.PREFIX || '.'}menu`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prefix = process.env.PREFIX || '.';
        const commands = global.commands || [];

        // Bot info
        const botName = process.env.BOT_NAME || 'KIRA X MD';
        const ownerName = process.env.OWNER_NAME || 'Madhav';
        const mode = process.env.MODE === 'private' ? '👑 Private' : '🌍 Public';
        const platform = `Node.js ${process.version}`;
        const totalCommands = commands.length;
        const user = msg.pushName || 'User';
        const userJid = msg.key.participant || jid;

        // Optional: uptime (if bot started time is stored globally)
        const uptime = global.startTime ? formatUptime(Date.now() - global.startTime) : 'N/A';

        // Build the dashboard
        let menu = `╭━━━━━━━━━━━━━━━━━━━╮\n`;
        menu += `┃✨ *${botName}* ✨\n`;
        menu += `╰━━━━━━━━━━━━━━━━━━━╯\n\n`;
        menu += `┌─👤 *USER INFO*\n`;
        menu += `│  Name : ${user}\n`;
        menu += `│  JID  : ${userJid.split('@')[0]}\n`;
        menu += `└──────────────────\n\n`;
        menu += `┌─🤖 *BOT STATS*\n`;
        menu += `│  Mode      : ${mode}\n`;
        menu += `│  Owner     : ${ownerName}\n`;
        menu += `│  Platform  : ${platform}\n`;
        menu += `│  Commands  : ${totalCommands}\n`;
        menu += `│  Uptime    : ${uptime}\n`;
        menu += `└──────────────────\n\n`;
        menu += `┌─📜 *COMMANDS (${totalCommands})*\n`;
        menu += `│  ${prefix}menu – show this panel\n`;

        // List first 10 commands (to keep message short)
        const maxDisplay = 15;
        for (let i = 0; i < Math.min(commands.length, maxDisplay); i++) {
            const cmd = commands[i];
            if (cmd.name === 'menu') continue;
            const aliases = cmd.alias?.length ? ` (${cmd.alias.slice(0,2).map(a=>prefix+a).join(', ')})` : '';
            menu += `│  ${prefix}${cmd.name}${aliases}\n`;
        }
        if (commands.length > maxDisplay) {
            menu += `│  ... and ${commands.length - maxDisplay} more\n`;
        }
        menu += `└──────────────────\n\n`;
        menu += `💡 *Send ${prefix}help <command>* for usage.\n`;
        menu += `━━━━━━━━━━━━━━━━━━━\n🔹 *${botName}* 🔹`;

        await sock.sendMessage(jid, { text: menu }, { quoted: msg });
    }
};

// Helper to format uptime
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