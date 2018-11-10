const expect = require('chai').expect;
const HdWallet = require('./HdWallet')

const port = 8081;
const server = require('socket.io')(port);
const ioClient = require('socket.io-client')
const clients = []
const connect = () => {
    const client = ioClient.connect(`http://localhost:${port}`);
    clients.push(client)
    return client
}
const close = () => {
    clients.forEach(client => client.close(() => console.log('client closed...')))
    server.close(() => console.log('server closed...'));
}

/**
 * Setup server
 */
const db = {}
server.on('connection', (socket) => {
    socket.on('newChatMessage', (data, cb) => {
        key = `${data.itemId}-chatKey`
        if (!db[key]) db[key] = {messages: [], accessKeys: []}
        db[key].messages.push(data.message)
        server.in(data.itemId).emit('chatChanged', db[key])
        cb('ok')
    })
    socket.on('subscribeToChat', (data, cb) => {
        key = `${data.itemId}-chatKey`
        if (!db[key]) db[key] = {messages: [], accessKeys: []}
        if (data.accessKeys) db[key].accessKeys.push(data.accessKeys)
        socket.join(data.itemId)
        socket.emit('chatChanged', db[key])
        cb(db[key].accessKeys)
    })
    socket.on('accessKeyPost', (itemId, data, cb) => {
        key = `${itemId}-chatKey`
        if (!db[key]) db[key] = []
        db[key].push(data)
        cb('ok')
    })
    socket.on('accessKeyGet', (itemId, cb) => {
        key = `${itemId}-chatKey`
        cb(db[key])
    })
    socket.on('chatMessagePost', (itemId, data, cb) => {
        key = `${itemId}-chat`
        if (!db[key]) db[key] = []
        db[key].push(data)
        server.to(itemId).emit('chatMessage', data)
        cb('ok')
    })
    socket.on('chatMessageGet', (itemId, cb) => {
        key = `${itemId}-chat`
        cb(db[key])
    })
    socket.on('chatMessageSub', (itemId) => {
        socket.join(itemId)
    })
});

function transport() {
    return connect()
}

describe('HdWallet class: ', () => {
    let hdWalletAlice
    let hdWalletBob
    let itemHash
    it('should give access to a chat to a provider', async () => {
        hdWalletAlice = new HdWallet({transport: transport(), name: 'Alice'})
        hdWalletBob = new HdWallet({transport: transport(), name: 'Bob'})
        itemHash = hdWalletAlice.createItem()
        const accessKeyBob = hdWalletBob.requestAccess(itemHash)
        await hdWalletAlice.giveAccess(itemHash, accessKeyBob)
        await hdWalletBob.getAccess(itemHash)
        const keyAlice = hdWalletAlice.items[Object.keys(hdWalletAlice.items)[0]].chatKey.toString('hex')
        const keyBob = hdWalletBob.items[Object.keys(hdWalletBob.items)[0]].chatKey.toString('hex')
        expect(keyAlice).to.equal(keyBob)
    })

    const aliceMessages = [
        'Hello Bob, I\'m Alice.',
        'So nice to meet you'
    ]
    
    it('Alice should post some messages in the common chat', async () => {
        // send messages on chat
        const bobMessages = []
        hdWalletBob.joinChat(itemHash, (message) => {
            bobMessages.push(message.text)
        })
        for (const message of aliceMessages) {
            await hdWalletAlice.sendMessage(itemHash, message)
        }
        // Check if messages were registered in the server's db
        const dbChatKey = Object.keys(db).find(key => key.endsWith('chat'))
        expect(db[dbChatKey]).to.exist
        expect(db[dbChatKey]).to.have.length(aliceMessages.length)
        // Check if bob received the messages
        expect(bobMessages).to.have.length(aliceMessages.length)
        for (const message of aliceMessages) {
            expect(bobMessages).to.include(message)
        }
    })

    it('Bob should be able to retrieve the messages at will', async () => {
        let retrievedMessages = await hdWalletBob.getMessages(itemHash)
        retrievedMessages = retrievedMessages.map(msg => msg.text)
        expect(retrievedMessages).to.have.length(aliceMessages.length)
        for (const message of aliceMessages) {
            expect(retrievedMessages).to.include(message)
        }
    })   

    after(() => {
        close()
    })
    
});