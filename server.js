var express = require('express');
var LINQ = require('node-linq').LINQ;
var { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js'); // Updated library import
var bodyParser = require('body-parser');
require('dotenv').config();

var app = express();
app.use(bodyParser.json({ limit: "50mb" }));
var port = process.env.PORT || 80;

String.prototype.padLeft = function (length, padding) {
    return Array(length - this.length + 1).join(padding || '0') + this;
};

// =========================================================================
// WAApi/Send Endpoint
// =========================================================================
app.post('/api/v1.0/WAApi/Send', async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log("/api/v1.0/WAApi/Send : ");
    console.log(req.props);

    if (typeof global.client !== 'undefined' && global.client.info) {
        try {
            if (req.props.MimeType && req.props.MimeType !== "") {
                const media = new MessageMedia(req.props.MimeType, req.props.Content, req.props.FileName);
                const result = await global.client.sendMessage(req.props.To, media, { caption: req.props.Caption });
                
                console.log('Send Media Result: ', result.id._serialized);
                res.send({
                    Success: true,
                    Data: {
                        IsSent: true,
                        MessageId: result.id._serialized,
                        Reason: ""
                    }
                });
            } else {
                const result = await global.client.sendMessage(req.props.To, req.props.Content);
                
                res.send({
                    Success: true,
                    Data: {
                        IsSent: true,
                        MessageId: result.id._serialized,
                        Reason: ""
                    }
                });
                console.log('Send Result: ', result.id._serialized);
            }
        } catch (erro) {
            console.error('Send Error when sending: ', erro);
            res.send({
                Success: false,
                Data: {
                    IsSent: false,
                    MessageId: "",
                    Reason: erro.message
                }
            });
        }
    } else {
        res.send({
            Success: false, // Changed from true to false for more accurate status
            Data: {
                IsSent: false,
                MessageId: "",
                Reason: "Device not yet connected"
            }
        });
    }
});

// =========================================================================
// WAApi/SendLinkPreview Endpoint
// =========================================================================
app.post("/api/v1.0/WAApi/SendLinkPreview", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log("/api/v1.0/WAApi/SendLinkPreview : ");
    console.log(req.props);

    if (typeof global.client !== 'undefined' && global.client.info) {
        try {
            // Note: whatsapp-web.js automatically creates a link preview if a URL is detected in the message
            const result = await global.client.sendMessage(req.props.To, req.props.Content);

            console.log('Result: ', result.id._serialized);
            res.send({
                Success: true,
                Data: {
                    IsSent: true,
                    MessageId: result.id._serialized,
                    Reason: ""
                }
            });
        } catch (erro) {
            console.error('Error when SendLinkPreview: ', erro);
            res.send({
                Success: false,
                Data: {
                    IsSent: false,
                    MessageId: "",
                    Reason: erro.message
                }
            });
        }
    } else {
        res.send({
            Success: false,
            Data: {
                IsSent: false,
                MessageId: "",
                Reason: "Device not yet connected"
            }
        });
    }
});

// =========================================================================
// WAApi/GetStatus Endpoint
// =========================================================================
app.get("/api/v1.0/WAApi/GetStatus", async function (req, res) {
    let status = "DISCONNECTED";
    if (typeof global.client !== 'undefined') {
        const state = await global.client.getState();
        status = state;
        console.log(status);
    }
    res.send({
        Success: true,
        Data: status
    });
});

// =========================================================================
// WAApi/ArchiveChat Endpoint
// =========================================================================
app.post("/api/v1.0/WAApi/ArchiveChat", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log("/api/v1.0/WAApi/ArchiveChat : ");
    console.log(req.props);

    if (typeof global.client !== 'undefined' && global.client.info) {
        try {
            const chat = await global.client.getChatById(req.props.chatId);
            const result = await chat.archive();
            res.send({ Success: result });
            console.log('Result: ', result);
        } catch (erro) {
            console.error('Error when ArchiveChat: ', erro);
            res.send({ Success: false });
        }
    } else {
        res.send({ Success: false });
    }
});

// =========================================================================
// WAApi/AllowedToSend Endpoint
// =========================================================================
app.get("/api/v1.0/WAApi/AllowedToSend", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);

    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: false });
    }

    try {
        const contact = await global.client.getContactById(req.props.ContactID);
        const contactfound = !!contact; // Check if contact exists
        const hasmessages = (await contact.getChat()).lastMessageId; // Check if there's a last message

        console.log(`Contact found: ${contactfound}, Has messages: ${!!hasmessages}`);

        res.send({
            Success: true,
            Data: contactfound && !!hasmessages
        });
    } catch (error) {
        console.error('Error in AllowedToSend:', error);
        res.send({ Success: false, Data: false });
    }
});

// =========================================================================
// WAApi/GetSettings and ResetSettings Endpoints
// =========================================================================
// Note: whatsapp-web.js does not have direct equivalents for these methods.
// getSessionTokenBrowser and resetSessionTokenBrowser are not part of its public API.
// The session is managed by the LocalAuth strategy. You'd need to manually
// delete the session folder to "reset" the settings.

app.get("/api/v1.0/WAApi/GetSettings", async function (req, res) {
    console.log("GetSettings");
    res.send({
        Success: false,
        Reason: "This functionality is not directly supported by whatsapp-web.js"
    });
});

app.get("/api/v1.0/WAApi/ResetSettings", async function (req, res) {
    res.send({
        Success: false,
        Reason: "To reset the session, manually delete the 'wwebjs_auth' folder."
    });
});

// =========================================================================
// WAApi/GetMessagesSince Endpoint
// =========================================================================
app.get("/api/v1.0/WAApi/GetMessagesSince", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('GetMessagesSince ' + req.props.Since);

    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: [] });
    }

    try {
        const sinceDate = (new Date(req.props.Since)).getTime() / 1000;
        const chat = await global.client.getChatById(req.props.ChatId);
        const allMessages = await chat.fetchMessages({ limit: 100 }); // Fetch a reasonable number of messages
        const messages = [];

        for (const message of allMessages) {
            if (message.timestamp > sinceDate) {
                const messageData = {
                    instanceID: process.env.InstanceID,
                    title: message.caption || '',
                    content: message.body,
                    chatID: message.from,
                    fromID: message.from,
                    toID: message.to,
                    authorID: message.author,
                    hasMedia: message.hasMedia,
                    messageID: message.id._serialized,
                    messageType: message.type,
                    type: message.type,
                    mimeType: message.mimetype || '',
                    accountID: '', // not directly available
                    t: message.timestamp
                };

                if (message.hasMedia) {
                    const media = await message.downloadMedia();
                    messageData.content = media.data; // Base64 content
                    messageData.mimeType = media.mimetype;
                }
                messages.push(messageData);
            }
        }
        res.send({
            Success: true,
            Data: messages
        });
    } catch (error) {
        console.error('Error in GetMessagesSince:', error);
        res.send({
            Success: false,
            Data: []
        });
    }
});

// =========================================================================
// WAApi/GetAllChats and GetAllChatsGroups Endpoints
// =========================================================================
app.get("/api/v1.0/WAApi/GetAllChats", async function (req, res) {
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: [] });
    }
    const chats = await global.client.getChats();
    res.send({
        Success: true,
        Data: chats
    });
});

app.get("/api/v1.0/WAApi/GetAllChatsGroups", async function (req, res) {
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: [] });
    }
    const chats = await global.client.getChats();
    const groups = chats.filter(chat => chat.isGroup);
    res.send({
        Success: true,
        Data: groups
    });
});

// =========================================================================
// Group Management Endpoints
// =========================================================================
// Note: `whatsapp-web.js` uses different method names for group management.

//change group description
app.post("/api/v1.0/WAApi/SetGroupDescription", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('change group description ' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const chat = await global.client.getChatById(req.props.ID);
        await chat.setDescription(req.props.Name);
        res.send({ Success: true, Data: 'OK' });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Leave group
app.post("/api/v1.0/WAApi/LeaveGroup", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('Leave group ' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const chat = await global.client.getChatById(req.props.ID);
        await chat.leave();
        res.send({ Success: true, Data: 'OK' });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Get group members
app.get("/api/v1.0/WAApi/GetGroupMembers", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('Get group members ' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const chat = await global.client.getChatById(req.props.ID);
        const participants = chat.participants;
        res.send({ Success: true, Data: participants });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Get group members ids
app.get("/api/v1.0/WAApi/GetGroupMembersIds", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('Get group members ids' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const chat = await global.client.getChatById(req.props.ID);
        const participants = chat.participants.map(p => p.id._serialized);
        res.send({ Success: true, Data: participants });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Create group (title, participants to add)
app.post("/api/v1.0/WAApi/CreateGroup", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('Create Group ' + req.props.Name);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false });
    }
    try {
        const result = await global.client.createGroup(req.props.Name, req.props.Ids);
        res.send({
            Success: true,
            Data: result.gid._serialized
        });
    } catch (erro) {
        console.error('Error creating group:', erro);
        res.send({ Success: false });
    }
});

// Remove participant
app.post("/api/v1.0/WAApi/RemoveParticipant", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('RemoveParticipant' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const result = await global.client.removeParticipants(req.props.ID, [req.props.Number]);
        res.send({ Success: true, Data: result });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Add participant
app.post("/api/v1.0/WAApi/AddParticipant", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('AddParticipant' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const result = await global.client.addParticipants(req.props.ID, [req.props.Number]);
        res.send({ Success: true, Data: result });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Promote participant (Give admin privileges)
app.post("/api/v1.0/WAApi/PromoteParticipant", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('PromoteParticipant' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const chat = await global.client.getChatById(req.props.ID);
        await chat.promoteParticipants([req.props.Number]);
        res.send({ Success: true, Data: 'OK' });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Demote participant (Revoke admin privileges)
app.post("/api/v1.0/WAApi/DemoteParticipant", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('DemoteParticipant' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const chat = await global.client.getChatById(req.props.ID);
        await chat.demoteParticipants([req.props.Number]);
        res.send({ Success: true, Data: 'OK' });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Get group admins
app.get("/api/v1.0/WAApi/GetGroupAdmins", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('GetGroupAdmins' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const chat = await global.client.getChatById(req.props.ID);
        const admins = chat.participants.filter(p => p.isAdmin);
        res.send({ Success: true, Data: admins });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Return the group status, jid, description from it's invite link
app.get("/api/v1.0/WAApi/GetGroupInfoFromInviteLink", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('GetGroupInfoFromInviteLink' + req.props.InviteCode);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const result = await global.client.getInviteInfo(req.props.InviteCode);
        res.send({ Success: true, Data: result });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Join a group using the group invite code
app.get("/api/v1.0/WAApi/JoinGroup", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('JoinGroup' + req.props.InviteCode);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const result = await global.client.acceptInvite(req.props.InviteCode);
        res.send({ Success: true, Data: result });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

// Delete chat
app.post("/api/v1.0/WAApi/DeleteChat", async function (req, res) {
    req.props = Object.assign(req.query, req.params, req.body);
    console.log('DeleteChat ' + req.props.ID);
    if (typeof global.client === 'undefined' || !global.client.info) {
        return res.send({ Success: false, Data: null });
    }
    try {
        const chat = await global.client.getChatById(req.props.ID);
        await chat.delete();
        res.send({ Success: true, Data: 'OK' });
    } catch (e) {
        res.send({ Success: false, Data: e.message });
    }
});

app.listen(port, function () {
    var datetime = new Date();
    var message = "Server runnning on Port:- " + port + " Started at :- " + datetime;
    console.log(message);
});
