const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot Aktif'));
app.listen(PORT, () => console.log(`Port ${PORT}`));

if (!fs.existsSync('./session')) fs.mkdirSync('./session');

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const sock = makeWASocket({
        printQRInTerminal: true, // Paksa true
        auth: state,
        logger: pino({ level: 'fatal' }) // Matikan log lain biar fokus ke QR
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n\n=== SCAN QR INI ===\n');
            qrcode.generate(qr, { small: true });
            console.log('\n===================\n\n');
        }

        if (connection === 'close') {
            console.log('Putus:', lastDisconnect.error?.output?.statusCode);
            if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                start();
            }
        } else if (connection === 'open') {
            console.log('✅ SUKSES CONNECT!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
            if (text === 'halo') {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Halo sayang! ❤️' });
            }
        }
    });
}

start();
