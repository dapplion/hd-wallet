const {generateMasterKeys} = require('./generateMasterKeys')
const item = require('./item')
const access = require('./access')
const toHex = require('./util/toHex')
const util = require('./util')

/**
 * Using a factory function function to achieve privacy for the keys
 * Using the crockford pattern: https://crockford.com/javascript/private.html
 * @param {Object} params
 */
function HdWallet({
    mnemonic, 
    transport: _transport, 
    storage: _storage, 
    name
} = {}) {
    // if mnemonic = null, a random keypair will be generated
    const masterKeys = generateMasterKeys(mnemonic)
    const items = {}
    let transport = wrapTransport(_transport)
    let storage = _storage

    function setTransport(_transport) {
        transport = wrapTransport(_transport)
    }
    function setStorage(_storage) {
        storage = _storage
    }

    function createItem() {
        const itemIdentity = item.keys.generate(masterKeys.item)
        items[itemIdentity.hash] = itemIdentity
        return itemIdentity.hash
    }

    function requestAccess(itemHash) {
        const accessKeypair = access.keys.generate(masterKeys.access, itemHash)
        return accessKeypair.publicKey
    }

    async function giveAccess(itemHash, recipientPublicKey) {
        let itemIdentity = items[itemHash]
        if (!itemIdentity) {
            itemIdentity = item.keys.recoverFromHash(masterKeys.item, itemHash)
        }
        const accessKeypair = access.keys.generate(masterKeys.access, itemHash)
        const envelope = access.give(itemIdentity.seed, recipientPublicKey, accessKeypair)
        // Send the envelope to the recipient
        return await transport.accessKey.post(toHex(itemHash), envelope)
    }

    async function getAccess(itemHash) {
        const accessKeypair = access.keys.generate(masterKeys.access, itemHash)
        const envelopes = await transport.accessKey.get(toHex(itemHash))
        for (const envelope of envelopes) {
            const itemSeed = access.get(envelope, accessKeypair)
            if (itemSeed) {
                items[itemHash] = item.keys.generateFromSeed(itemSeed)
                return
            }
        }
        throw Error('No valid key found')
    }

    async function sendMessage(itemHash, text) {
        if (!items[itemHash]) throw Error('Chat keys not available')
        const payload = item.chat.sendMessage(text, name, items[itemHash])
        await transport.chatMessage.post(toHex(itemHash), payload)
    }

    async function getMessages(itemHash) {
        if (!items[itemHash]) throw Error('Chat keys not available')
        const payloads = await transport.chatMessage.get(toHex(itemHash))
        return payloads
            .map(payload => item.chat.openMessage(payload, items[itemHash]))
            .filter(message => message)     
    }

    function joinChat(itemHash, callback) {
        if (!items[itemHash]) throw Error('Chat keys not available: '+JSON.stringify(items))
        transport.chatMessage.sub(toHex(itemHash), (payload) => {
            const message = item.chat.openMessage(payload, items[itemHash])
            callback(message)
        })
    }
    return {
        // static properties
        version: '0.1.0-commit#dcceb2',
        util,
        name,
        transport,
        storage,
        // methods
        setTransport,
        setStorage,
        createItem,
        requestAccess,
        giveAccess,
        getAccess,
        sendMessage,
        getMessages,
        joinChat,
    }
}

function wrapTransport(transport) {
    const handler = (resolve, reject) => (res) => {
        if (res.response === 200) {
            resolve(res.data || res.message)
        } else {
            reject(res.message)
        }
    }
    return {
        accessKey: {
            get: (itemId) => new Promise((resolve, reject) => {
                transport.emit('accessKeyGet', itemId, handler(resolve, reject))
            }),
            post: (itemId, data) => new Promise((resolve, reject) => {
                transport.emit('accessKeyPost', itemId, data, handler(resolve, reject))
            })
        },
        chatMessage: {
            get: (itemId) => new Promise((resolve, reject) => {
                transport.emit('chatMessageGet', itemId, handler(resolve, reject))
            }),
            post: (itemId, data) => new Promise((resolve, reject) => {
                transport.emit('chatMessagePost', itemId, data, handler(resolve, reject))
            }),
            sub: (itemId, cb) => {
                transport.emit('chatMessageSub', itemId)
                transport.on('chatMessage', cb)
            }
        }
    }
}

// Uint8Array to hex
// const itemSeedHex = (new Buffer.from(itemIdentity.seed)).toString('hex')

module.exports = HdWallet