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
        // console.log('Socket msg: ', 'newChatMessage', data)
        key = `chat-${data.itemHash}`
        let chatObject = db[key]
        if (!chatObject) chatObject = {};
        if (!chatObject.messages) chatObject.messages = [];
        chatObject.messages.push(data.message)
        db[key] = chatObject
        server.in(data.itemHash).clients((err , clients) => {
            console.log('Emitting chat changed to clients '+clients.length+', # message: '+chatObject.messages.length)
        });
        server.in(data.itemHash).emit('chatChanged', chatObject)
        cb({response: 200, message: 'successfully posted message'})
    })

    socket.on('subscribeToChat', (data, cb) => {
        // console.log('Socket msg: ', 'subscribeToChat', data)
        key = `chat-${data.itemHash}`
        let chatObject = db[key]
        if (!chatObject) chatObject = {};
        if (!chatObject.accessKeys) chatObject.accessKeys = [];
        if (data.accessKeys) chatObject.accessKeys.push(data.accessKeys)
        socket.join(data.itemHash)
        socket.emit('chatChanged', chatObject)
        db[key] = chatObject
        cb({response: 200, message: 'successfully subscribed to chat'})
    })
});

function transport(id) {
    return connect(id)
}

const pause = ms => new Promise((r) => setTimeout(r, ms))

describe('HdWallet class: ', () => {
    const privateKeyAlice = "0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709"
    const privateKeyBob = "0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098"
    let socketClientAlice
    let socketClientBob
    let hdWalletAlice
    let hdWalletBob
    let itemHash

    it('should create socket clients for the test', async () => {
        socketClientAlice = transport('Alice')
        await pause(100)
        socketClientBob = transport('Bob')
        await pause(100)
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

        itemHash = hdWalletAlice.createItem(privateKeyAlice)
        expect(itemHash).to.exist
        expect(itemHash).to.be.a('Uint8Array')
        expect(itemHash).to.have.length(32)

        const accessKeyBob = hdWalletBob.requestAccess(privateKeyBob, itemHash)
        expect(accessKeyBob).to.exist
        expect(accessKeyBob).to.be.a('Uint8Array')
        expect(accessKeyBob).to.have.length(32)

        const res = await hdWalletAlice.giveAccess(null, itemHash, accessKeyBob)
        console.log(res)
    })

    const aliceMessages = [
        'Hello Bob, I\'m Alice.',
        'So nice to meet you'
    ]
    
    it('Alice should post some messages in the common chat', async () => {
        // send messages on chat
        let bobMessages = []
        hdWalletBob.joinChat(null, itemHash, (messages) => {
            console.log('Bob received messages:', messages.length)
            bobMessages = messages.map(msg => msg.text)
        })
        await pause(100)
        for (const message of aliceMessages) {
            const res = await hdWalletAlice.sendMessage(itemHash, message)
            console.log('Alice sent message, res: '+res)
            expect(res).to.exist
            await pause(100)
        }
        // Check if messages were registered in the server's db
        const dbChatKey = Object.keys(db).find(key => key.startsWith('chat'))
        expect(db[dbChatKey]).to.exist
        expect(db[dbChatKey].messages).to.have.length(aliceMessages.length)
        // Check if bob received the messages
        expect(bobMessages).to.have.length(aliceMessages.length)

        for (const message of aliceMessages) {
            expect(bobMessages).to.include(message)
        }
    })

    it('Bob should be able to retrieve the messages at will', async () => {
        // send messages on chat
        let retrievedMessages = []
        hdWalletBob.joinChat(null, itemHash, (messages) => {
            console.log('Bob received messages:', messages.length)
            retrievedMessages = messages.map(msg => msg.text)
        })
        await pause(100)

        expect(retrievedMessages).to.have.length(aliceMessages.length)
        for (const message of aliceMessages) {
            expect(retrievedMessages).to.include(message)
        }
    })   

    after(() => {
        close()
    })
    
});