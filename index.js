require("dotenv").config();
const fs = require('fs');
const http = require('http');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const P = require("pino");

const { commands, loadPlugins } = require("./lib/plugins");
loadPlugins();
global.commands = commands;

// Global settings
global.antiWordChats = [];
global.badWords = [];

global.antiBotChats = [];
global.antiPromoteChats = [];
global.antiDemoteChats = [];
global.antiFakeChats = [];
global.antiSpamChats = [];
global.spamData = {};
global.warnData = global.warnData || {};
global.warnLimit = global.warnLimit || 3;
global.botMode = 'public';
global.ownerNumber = process.env.BOT_NUMBER + "@s.whatsapp.net";

global.autoDlChats = [];
global.autoDlAllGroups = false;
global.autoDlAllDms = false;

global.antiDeleteChats = [];
global.messageStore = {};

global.callReject = false;
global.botOnline = true;

global.welcomeChats = [];
global.goodbyeChats = [];
global.antilinkChats = [];

global.settingsMessages = [];

global.sudoUsers = process.env.SUDO_NUMBERS
    ? process.env.SUDO_NUMBERS
        .split(",")
        .map(x => x.trim() + "@s.whatsapp.net")
    : [];

// Global API Configuration
global.api = {
    fb: process.env.FB_API,
    shazam: process.env.SHAZAM_API,
    giphy: process.env.GIPHY_API,
    serp: process.env.SERPAPI_KEY,
    insta: process.env.INSTA_API,
    geniusKeys: process.env.GENIUS_KEYS ? process.env.GENIUS_KEYS.split(';') : [],
    pinDl: process.env.PIN_DL_API,
    pinSearch: process.env.PIN_SEARCH_API,
    tenor: process.env.TENOR_API_KEY,
    ytVideo: process.env.YT_VIDEO_API,
    ytVideoList: process.env.YT_VIDEO_APIS ? process.env.YT_VIDEO_APIS.split(';') : [],
    ytmp3List: process.env.YT_MP3_APIS ? process.env.YT_MP3_APIS.split(';') : []
};

let isStarted = false; 
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

http.createServer((req, res) => res.end('KIRA-X-MD Online')).listen(process.env.PORT || 3000);

async function startKira() {
    console.log("STARTKIRA CALLED");
    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        console.log("🔄 Loading session from SESSION_ID...");
        if (!fs.existsSync("./session")) fs.mkdirSync("./session");
        let sessionId = process.env.SESSION_ID;

if (sessionId.startsWith("KIRA~")) {
    sessionId = sessionId.slice(5);
}

fs.writeFileSync(
    "./session/creds.json",
    Buffer.from(sessionId, "base64").toString()
);
    }
const { state, saveCreds } = await useMultiFileAuthState("./session");
const { version } = await fetchLatestBaileysVersion();

    console.log("SOCKET CREATED");
    const sock = makeWASocket({
        version,
        logger: P({ level: "fatal" }),
        auth: state,
        printQRInTerminal: true 
    });

    if (
    !sock.authState.creds.registered &&
    !process.env.SESSION_ID
) {
        const phoneNumber = process.env.BOT_NUMBER;
        if (phoneNumber) {
            setTimeout(async () => {
                let code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
                console.log("\n🔑 *YOUR PAIRING CODE:* " + code + "\n");
            }, 3000);
        }
    }

    sock.ev.on("call", async (calls) => {

    if (!global.callReject) return;

    for (const call of calls) {

        if (call.status === "offer") {

            await sock.rejectCall(call.id, call.from);

            await sock.sendMessage(
                call.from,
                {
                    text: "📵 Calls are not allowed. Please send a message."
                }
            );
        }
    }
});

sock.ev.on("connection.update", async (update) => {
    console.log("CONNECTION UPDATE:", update);
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
        console.log("✅ KIRA X MD Connected Successfully!");
        try {
            await sock.groupAcceptInvite("C3hbXjblNLiF7CoDYJ8lwY");
        } catch (e) { }

        if (!isStarted) {
            await sock.sendMessage(global.ownerNumber, {
                text: `╭━━━〔 KIRA-X-MD 〕━━━⬣

✅ Connected Successfully

👤 Owner : Madhav
🤖 Bot : KIRA-X-MD
🌐 Repo :
https://github.com/Madhavgkmd/kira-md-bot

📢 Support Group :
https://chat.whatsapp.com/C3hbXjblNLiF7CoDYJ8lwY

╰━━━━━━━━━━━━━━⬣`
            });
            isStarted = true;
        }
    }

    if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) startKira();
    }
});

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("messages.update", async (updates) => {
    try {

        for (const update of updates) {

            if (
                update.update?.message === null ||
                update.update?.messageStubType
            ) {

                const key = update.key;
                if (!key) continue;

                const jid = key.remoteJid;

                if (!global.antiDeleteChats.includes(jid))
                    continue;

                const deletedMsg =
                    global.messageStore[key.id];

                if (!deletedMsg)
                    continue;

                const sender =
                    deletedMsg.participant ||
                    deletedMsg.key.participant ||
                    deletedMsg.key.remoteJid;

                await sock.sendMessage(
                    global.ownerNumber,
                    {
                        text:
`🚨 DELETED MESSAGE

👤 USER:
${sender}

💬 CHAT:
${jid}`
                    }
                );

                await sock.sendMessage(
                    global.ownerNumber,
                    {
                        forward: deletedMsg
                    }
                );
            }
        }

    } catch (err) {
        console.log("ANTI DELETE ERROR:", err);
    }
});

// ===== WELCOME & GOODBYE =====

global.welcomeChats = global.welcomeChats || [];
global.goodbyeChats = global.goodbyeChats || [];

sock.ev.on("group-participants.update", async (update) => {
    console.log("GROUP UPDATE:", JSON.stringify(update, null, 2));

    try {
        const jid = update.id;
        const action = update.action;

        for (const participant of update.participants) {

            // Welcome
            if (
                (action === "add" || action === "join") &&
                global.welcomeChats.includes(jid)
            ) {
                await sock.sendMessage(jid, {
                    text: `🎉 Welcome @${(participant.id || participant).split("@")[0]} to the group!`,
                    mentions: [participant.id || participant]
                });
            }

            // Goodbye
            if (
                (action === "remove" || action === "leave") &&
                global.goodbyeChats.includes(jid)
            ) {
                await sock.sendMessage(jid, {
                    text: `👋 Goodbye @${(participant.id || participant).split("@")[0]}!`,
                    mentions: [participant.id || participant]
                });
            }

            // 👇 ANTIFAKE
            if (
                (action === "add" || action === "join") &&
                global.antiFakeChats?.includes(jid)
            ) {
                const user = participant.id || participant;

                if (!user.startsWith("91")) {
                    await sock.groupParticipantsUpdate(
                        jid,
                        [user],
                        "remove"
                    );
                }
            }

            // 👇 ANTIBOT
            if (
                (action === "add" || action === "join") &&
                global.antiBotChats?.includes(jid)
            ) {
                const user = participant.id || participant;

                if (user.includes(":")) {
                    await sock.groupParticipantsUpdate(
                        jid,
                        [user],
                        "remove"
                    );
                }
            }
        }

    } catch (err) {
        console.log("WELCOME/GOODBYE ERROR:", err);
    }
});
    

sock.ev.on("messages.upsert", async ({ messages }) => {
    try {

        const msg = messages[0];

        if (
    global.autoReact &&
    !msg.key.fromMe
) {
    await sock.sendMessage(
        msg.key.remoteJid,
        {
            react: {
                text: "❤️",
                key: msg.key
            }
        }
    );
}

        if (global.autoRead) {
    await sock.readMessages([msg.key]);
}

        const jid = msg.key.remoteJid;

        const isGroup = jid.endsWith("@g.us");
const sender = msg.key.fromMe
    ? sock.user.id.split(':')[0] + "@s.whatsapp.net"
    : (msg.participant || jid);

const isOwner = sender === global.ownerNumber;

// ANTI SPAM HERE 👇

// anti spam code

const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    "";
    if (
    isGroup &&
    global.antiWordChats.includes(jid)
) {
    const lower = text.toLowerCase();

    const found = global.badWords.find(
        w => lower.includes(w.toLowerCase())
    );

    if (found && !isOwner) {

        await sock.sendMessage(jid,{
            text:
`🚫 Bad Word Detected

Word: ${found}

@${sender.split("@")[0]}`,
            mentions:[sender]
        });

        try {
            await sock.groupParticipantsUpdate(
                jid,
                [sender],
                "remove"
            );
        } catch {}
    }
}

if (!global.botOnline) return;

        if (msg.key?.id) {
            global.messageStore[msg.key.id] = msg;

            if (Object.keys(global.messageStore).length > 5000) {
                delete global.messageStore[
                    Object.keys(global.messageStore)[0]
                ];
            }
        }

        if (!msg.message) return;

        console.log(
            "📩 Message from",
            msg.key.remoteJid,
            ":",
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text
        );

        if (global.botOnline) {
    await sock.sendPresenceUpdate(
        "available",
        jid
    );
}
        const isSudo = global.sudoUsers?.includes(sender);
        const isOwnerOrSudo = isOwner || isSudo;
        

        global.settingsReplies = global.settingsReplies || {};
if (
    msg.message?.extendedTextMessage?.contextInfo?.stanzaId
) {
    const replyId =
        msg.message.extendedTextMessage.contextInfo.stanzaId;

    if (
        global.settingsReplies[replyId] &&
        isOwner
    ) {
        const parts = text.toLowerCase().split(" ");

        const num = parts[0];
        const state = parts[1];

        if (!["on", "off"].includes(state)) return;

        const value = state === "on";

        switch (num) {

            case "1":
                global.botMode =
                    value ? "public" : "private";
                break;

            case "2":
                global.autoDlAllGroups = value;
                break;

            case "3":
                global.autoDlAllDms = value;
                break;

            case "4":
                if (value) {
                    if (!global.antiDeleteChats.includes(jid))
                        global.antiDeleteChats.push(jid);
                } else {
                    global.antiDeleteChats =
                        global.antiDeleteChats.filter(
                            x => x !== jid
                        );
                }
                break;

            case "5":
                if (value) {
                    if (!global.welcomeChats.includes(jid))
                        global.welcomeChats.push(jid);
                } else {
                    global.welcomeChats =
                        global.welcomeChats.filter(
                            x => x !== jid
                        );
                }
                break;

            case "6":
                if (value) {
                    if (!global.goodbyeChats.includes(jid))
                        global.goodbyeChats.push(jid);
                } else {
                    global.goodbyeChats =
                        global.goodbyeChats.filter(
                            x => x !== jid
                        );
                }
                break;

            case "7":
                if (value) {
                    if (!global.antilinkChats.includes(jid))
                        global.antilinkChats.push(jid);
                } else {
                    global.antilinkChats =
                        global.antilinkChats.filter(
                            x => x !== jid
                        );
                }
                break;

            case "8":
                global.callReject = value;
                break;

            case "9":
                global.botOnline = value;
                break;

            default:
                return;

             
        }


        return await sock.sendMessage(
            jid,
            {
                text: `✅ Setting ${num} updated to *${state.toUpperCase()}*`
            },
            { quoted: msg }
        );
    }
}
           
           
          

            const quotedId =
msg.message?.extendedTextMessage
?.contextInfo?.stanzaId;

if (
    quotedId &&
    global.settingsMessages.includes(quotedId)
) {

    const [option, value] =
    text.trim().split(" ");

    const enabled =
    value?.toLowerCase() === "on";

    switch (option) {

        case "8":
            global.callReject = enabled;
            break;

        case "9":
            global.botOnline = enabled;
            break;
    }

    await sock.sendMessage(
        jid,
        {
            text:
`✅ Setting Updated

Option: ${option}
State: ${enabled ? "ON" : "OFF"}`
        },
        { quoted: msg }
    );

    return;
}
        const prefix = process.env.PREFIX || ".";
// ===== AUTO DL =====

global.autoDlChats = global.autoDlChats || [];
global.autoDlAllGroups = global.autoDlAllGroups || false;
global.autoDlAllDms = global.autoDlAllDms || false;

const autoDlEnabled =
    global.autoDlChats.includes(jid) ||
    (global.autoDlAllGroups && isGroup) ||
    (global.autoDlAllDms && !isGroup);

if (
    autoDlEnabled &&
    text &&
    !text.startsWith(prefix)
) {
    try {

        await global.sleep(2000);

        if (/instagram\.com/i.test(text)) {
            const insta = commands.find(c => c.name === "insta");
            if (insta) return await insta.execute(sock, msg, [text]);
        }

        if (/facebook\.com|fb\.watch/i.test(text)) {
            const fb = commands.find(c => c.name === "fb");
            if (fb) return await fb.execute(sock, msg, [text]);
        }

        if (/youtube\.com|youtu\.be/i.test(text)) {
            const ytv = commands.find(c => c.name === "ytv");
            if (ytv) return await ytv.execute(sock, msg, [text]);
        }

    } catch (e) {
        console.error("AUTO DL ERROR:", e);
    }
} 
        if (!text.startsWith(prefix)) return;

        const args = text.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = commands.find(cmd => cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName)));

        if (command) {
    if (global.botMode === 'private' && !isOwnerOrSudo)
    return;

if (
    command.category === 'owner' &&
    !isOwnerOrSudo
) {
    return await sock.sendMessage(
        jid,
        { text: "❌ *Owner only!*" },
        { quoted: msg }
    );
}

    // Human-like delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    await command.execute(sock, msg, args, isOwner);
}
     } catch (err) {
            console.error("========== COMMAND ERROR ==========");
            console.error("MESSAGE:", err?.message);
            console.error("STACK:", err?.stack);
            console.error("FULL ERROR:", err);
            console.error("===================================");
        }
    });

}

startKira().catch(err => {
    console.error("START ERROR:", err);
});