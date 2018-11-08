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

const hdWallet = require('../src')

// server.on('connection', (socket) => {
//     console.log('Socket connected')
//     socket.on('test', (data) => {
//         server.emit('reply', { hello: 'world' });
//         console.log(data);
//     });
// });

// Setup Alice
const masterKeysAlice = hdWallet.generateMasterKeys()

// Alice should store itemIdentity.seed in the server
const clientAlice = connect()
// clientA.on('reply', reply => {
//     console.log('A: ', reply)
// })

// Setup Bob
const masterKeysBob = hdWallet.generateMasterKeys()
const clientBob = connect()
// clientB.on('reply', reply => {
//     console.log('B: ', reply)
// })
// clientA.emit('test', 'oh hi!!')

// Step 1. Alice creates an item
const itemHash = hdWallet.item.keys.generate(masterKeysAlice.item).hash
const accessKeypairAlice = generate(masterKeysAlice.access, itemHash)
const publicKeyAlice = accessKeypairAlice.publicKey

// Step 2. Bob replies to it and gives access to his public key to alice
const accessKeypairBob = generate(masterKeysBob.access, itemHash)
const publicKeyBob = accessKeypairBob.publicKey

// Step 3. Alice selects Bob and encrypts the item seed with his public key
const itemSeedForBob = hdWallet.access.give(itemHash, publicKeyBob, accessKeypairAlice.secretKey)

// const publicKeyChatAccessBob = 

// Close server to finish test
close()