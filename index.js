const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
require('dotenv').config();

// Initialize Express app and client in the same file to ensure they are connected
const app = require('./app'); // Assuming your API file is named app.js

var ip = Object.values(require('os').networkInterfaces()).reduce((r, list) => r.concat(list.reduce((rr, i) => rr.concat(i.family === 'IPv4' && !i.internal && i.address || []), [])), []);

axios.post(process.env.ServerIP + '/api/v1.0/WACallback/UpdateIP', {
    "instanceID": process.env.InstanceID,
    "ip": ip[0]
}).then(res => {
    console.log(`ip sent: ${res.status}` + ip[0]);
    console.log(res.data);
})
.catch(error => {
    console.error(error);
});

// Initialize the WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox'] // Recommended for Docker environments
    }
});

// Set the client as a global variable so it can be accessed by the Express routes
global.client = client;

// QR Code Event
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });

    // Convert QR string to base64 and send to server
    const qrBuffer = Buffer.from(qr);
    axios.post(process.env.ServerIP + '/api/v1.0/WACallback/QRCodeReceived', {
        "instanceID": process.env.InstanceID,
        "qrData": qrBuffer.toString('base64')
    }).then(res => {
        console.log(`qr sent: ${res.status}`);
        console.log(res.data);
    })
    .catch(error => {
        console.error(error);
    });
});

// Client Ready Event
client.on('ready', () => {
    console.log('Client is ready!');
    axios.post(process.env.ServerIP + '/api/v1.0/WACallback/StatusReceived', {
        "instanceID": process.env.InstanceID,
        "status": "ready"
    }).then(res => {
        console.log(`status sent: ${res.status}`);
        console.log(res.data);
    })
    .catch(error => {
        console.error(error);
    });
});

// Authentication Failure Event (e.g., session expired)
client.on('auth_failure', (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
    axios.post(process.env.ServerIP + '/api/v1.0/WACallback/StatusReceived', {
        "instanceID": process.env.InstanceID,
        "status": "auth_failure"
    }).then(res => {
        console.log(`status sent: ${res.status}`);
        console.log(res.data);
    })
    .catch(error => {
        console.error(error);
    });
});

// Message Received Event
client.on('message', async (message) => {
    console.log('MESSAGE RECEIVED', message.body);

    // Check if the message is from me or someone else
    const isFromMe = message.fromMe;
    
    // Check if the message has media
    const hasMedia = message.hasMedia;

    try {
        if (hasMedia) {
            const media = await message.downloadMedia();
            axios
                .post(process.env.ServerIP + '/api/v1.0/WACallback/MessageRecieved', {
                    "instanceID": process.env.InstanceID,
                    "title": message.caption, // caption instead of title for media
                    "content": media.data, // base64 content
                    "chatID": message.from,
                    "fromID": message.from,
                    "toID": message.to,
                    "authorID": message.author,
                    "hasMedia": hasMedia,
                    "messageID": message.id._serialized,
                    "messageType": message.type,
                    "type": message.type,
                    "mimeType": media.mimetype,
                    "accountID": '',
                    "t": message.timestamp
                })
                .then(res => {
                    console.log(`MAMR - Media [${message.type}] : statusCode: ${res.status}`);
                    console.log(res.data);
                })
                .catch(error => {
                    console.error(error);
                });
        } else {
            axios
                .post(process.env.ServerIP + '/api/v1.0/WACallback/MessageRecieved', {
                    "instanceID": process.env.InstanceID,
                    "title": message.title, // For text messages, this might be null
                    "content": message.body,
                    "chatID": message.from,
                    "fromID": message.from,
                    "toID": message.to,
                    "authorID": message.author,
                    "hasMedia": false,
                    "messageID": message.id._serialized,
                    "messageType": message.type,
                    "type": message.type,
                    "mimeType": null,
                    "accountID": '',
                    "t": message.timestamp
                })
                .then(res => {
                    console.log(`MAMR - Normal [${message.type}] : statusCode: ${res.status}`);
                    console.log(res.data);
                })
                .catch(error => {
                    console.error(error);
                });
        }
    } catch (e) {
        console.error('Error processing message:', e);
    }
});

// State Change Event
client.on('change_state', (state) => {
    console.log('State Connection Stream: ' + state);
    axios.post(process.env.ServerIP + '/api/v1.0/WACallback/StatusReceived', {
        "instanceID": process.env.InstanceID,
        "status": state
    }).then(res => {
        console.log(`status sent: ${res.status}`);
        console.log(res.data);
    })
    .catch(error => {
        console.error(error);
    });

    // force whatsapp take over
    if (state === 'CONFLICT') client.useHere();
});

// Initialize the client
client.initialize();
