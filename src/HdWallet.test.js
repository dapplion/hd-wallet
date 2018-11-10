const expect = require('chai').expect;
const HdWallet = require('./HdWallet')

const port = 8089;
const server = require('socket.io')(port);
const ioClient = require('socket.io-client')
const clients = []
const connect = (id) => {
    const client = ioClient.connect(`http://localhost:${port}`);
    console.log(`Connected ${id}`)
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
    console.log('Socket connected', socket.id)

    socket.on('newChatMessage', (data, cb) => {
        key = `${data.itemId}-chatKey`
        if (!db[key]) db[key] = {messages: [], accessKeys: []}
        db[key].messages.push(data.message)
        server.in(data.itemId).emit('chatChanged', db[key])
        cb({response: 200, message: 'successfully posted message'})
    })
    socket.on('subscribeToChat', (data, cb) => {
        key = `${data.itemId}-chatKey`
        if (!db[key]) db[key] = {messages: [], accessKeys: []}
        if (data.accessKeys) db[key].accessKeys.push(data.accessKeys)
        socket.join(data.itemId)
        socket.emit('chatChanged', db[key])
        cb({response: 200, data: db[key].accessKeys})
    })
    socket.on('accessKeyPost', (itemId, data, cb) => {
        key = `${itemId}-chatKey`
        if (!db[key]) db[key] = []
        db[key].push(data)
        cb({response: 200, message: 'successfully posted key'})
    })
    socket.on('accessKeyGet', (itemId, cb) => {
        key = `${itemId}-chatKey`
        cb({response: 200, data: db[key]})
    })
    socket.on('chatMessagePost', (itemId, data, cb) => {
        key = `${itemId}-chat`
        if (!db[key]) db[key] = []
        db[key].push(data)
        server.to(itemId).emit('chatMessage', data)
        cb({response: 200, message: 'successfully posted message'})
    })
    socket.on('chatMessageGet', (itemId, cb) => {
        key = `${itemId}-chat`
        cb({response: 200, data: db[key]})
    })
    socket.on('chatMessageSub', (itemId) => {
        socket.join(itemId)
    })
});

function transport(id) {
    return connect(id)
}

describe('HdWallet class: ', () => {
    let socketClientAlice
    let socketClientBob
    let hdWalletAlice
    let hdWalletBob
    let itemHash
    it('should create socket clients for the test', () => {
        socketClientAlice = transport('Alice')
        socketClientBob = transport('Bob')
    })
    it('should give access to a chat to a provider', async () => {
        hdWalletAlice = new HdWallet({
            transport: socketClientAlice, 
            name: 'Alice'
        })
        hdWalletBob = new HdWallet({
            transport: socketClientBob, 
            name: 'Bob'
        })

        itemHash = hdWalletAlice.createItem()
        expect(itemHash).to.exist
        expect(itemHash).to.be.a('Uint8Array')
        expect(itemHash).to.have.length(32)

        const accessKeyBob = hdWalletBob.requestAccess(itemHash)
        expect(accessKeyBob).to.exist
        expect(accessKeyBob).to.be.a('Uint8Array')
        expect(accessKeyBob).to.have.length(32)

        const res = await hdWalletAlice.giveAccess(itemHash, accessKeyBob)
        console.log(res)

        const res2 = await hdWalletBob.getAccess(itemHash)
        console.log(res2)
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