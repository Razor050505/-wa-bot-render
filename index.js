const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot WhatsApp Aktif! ❤️');
});

app.listen(PORT, () => {
    console.log(`Server jalan di port ${PORT}`);
});

// Pastikan folder session ada
if (!fs.existsSync('./session')){
    fs.mkdirSync('./session');
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const sock = makeWASocket({
        // Kita set false dulu, nanti kita handle manual
        printQRInTerminal: false, 
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("-----------------------------------------");
            console.log("🔥 SCAN QR CODE DI BAWAH INI 🔥");
            console.log("-----------------------------------------");
            // Paksa render QR ke terminal
            qrcode.generate(qr, { small: true }); 
            console.log("-----------------------------------------");
            console.log("Jika tidak terlihat jelas, screenshot log ini & scan via HP lain");
            console.log("-----------------------------------------");
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode) !== DisconnectReason.loggedOut;
            console.log('Koneksi putus. Alasan:', lastDisconnect.error?.output?.statusCode);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot terhubung sukses! Sayangku hebat! 🥰');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (!message.key.fromMe && m.type === 'notify') {
            const from = message.key.remoteJid;
            const body = message.message?.conversation || message.message?.extendedTextMessage?.text;

            if (body && body.toLowerCase() === 'halo') {
                await sock.sendMessage(from, { text: 'Halo sayang! Bot aktif nih 🥰' });
            }
        }
    });
}

startBot();
