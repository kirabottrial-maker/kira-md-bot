require("dotenv").config();

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

// 🚀 SPEED OPTIMIZATION: Command Map for Instant Lookup
const commandMap = new Map();
commands.forEach(cmd => {
    commandMap.set(cmd.name, cmd);
    if (cmd.alias) {
        cmd.alias.forEach(alias => commandMap.set(alias, cmd));
    }
});

async function startKira() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: state,
        printQRInTerminal: false, // 🚫 QR കോഡ് ഓഫ് ആക്കി
        browser: ["Ubuntu", "Chrome", "20.0.04"] // പെയറിങ് കോഡിന് ഇത് ആവശ്യമാണ്
    });

    // 🚀 PAIRING CODE LOGIC: സുരക്ഷിതമായി നമ്പർ എടുക്കുന്നു
    if (!sock.authState.creds.registered) {
        
        // പാനലിലെ വേരിയബിളിൽ നിന്ന് നേരിട്ട് നമ്പർ എടുക്കാൻ
        const phoneNumber = process.env.BOT_NUMBER; 
        
        if (phoneNumber) {
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(`\n=========================================`);
                    console.log(`🔢 നിന്റെ PAIRING CODE ഇതാണ്: ${code}`);
                    console.log(`=========================================\n`);
                } catch (err) {
                    console.log("Pairing code error:", err);
                }
            }, 3000);
        } else {
            console.log("\n⚠️ ശ്രദ്ധിക്കുക: BOT_NUMBER എന്ന വേരിയബിൾ പാനലിൽ കൊടുത്തിട്ടില്ല!");
            console.log("ദയവായി നിന്റെ Railway/Render പാനലിൽ പോയി Variables-ൽ BOT_NUMBER ആഡ് ചെയ്യുക.\n");
        }
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("✅ KIRA X MD Connected Successfully! 🚀 Ready to fly!");
        }

        if (connection === "close") {
            console.log("⚠️ Connection Closed");
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log("🔄 Reconnecting in 5 seconds...");
                setTimeout(() => startKira(), 5000);
            } else {
                console.log("❌ Logged Out. Delete session and try again.");
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];

            if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                "";

            const prefix = process.env.PREFIX || ".";

            if (!text.startsWith(prefix)) return;

            const commandName = text
                .slice(prefix.length)
                .trim()
                .split(" ")[0]
                .toLowerCase();

            const args = text
                .slice(prefix.length + commandName.length)
                .trim()
                .split(/ +/)
                .filter(Boolean);

            const command = commandMap.get(commandName);

            if (!command) return;

            await command.execute(sock, msg, args);
        } catch (err) {
            console.error("Command Error:", err);
        }
    });
}

startKira();