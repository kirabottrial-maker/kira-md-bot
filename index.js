require("dotenv").config();

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");
const P = require("pino");

const { commands, loadPlugins } = require("./lib/plugins");

loadPlugins();

// Make commands globally available for menu (auto‑update)
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
        printQRInTerminal: false
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            console.log("\n📱 Scan QR Code:\n");
            // 🛠️ FIXED: QR കോഡ് കൃത്യം ചതുരത്തിൽ വരാൻ { small: true } ആക്കി!
            qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
            console.log("✅ KIRA X MD Connected Successfully! 🚀 Ready to fly!");
        }

        if (connection === "close") {
            console.log("⚠️ Connection Closed");
            console.log("Reason:", lastDisconnect?.error);

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log("🔄 Reconnecting in 5 seconds...");
                setTimeout(() => startKira(), 5000);
            } else {
                console.log("❌ Logged Out. Delete session and scan QR again.");
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages;

            // 🚀 SPEED OPTIMIZATION: സ്റ്റാറ്റസ് മെസ്സേജുകൾ റീഡ് ചെയ്ത് ബോട്ട് സ്ലോ ആവാതിരിക്കാൻ
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
                .split(" ")
                .toLowerCase();

            const args = text
                .slice(prefix.length + commandName.length)
                .trim()
                .split(/ +/)
                .filter(Boolean);

            // 🚀 SPEED OPTIMIZATION: Instant Command Execution
            const command = commandMap.get(commandName);

            if (!command) return;

            // No delay, no typing indicator – instant execution
            await command.execute(sock, msg, args);
        } catch (err) {
            console.error("Command Error:", err);
        }
    });
}

startKira();