const {generateMasterKeys} = require('./generateMasterKeys')
const item = require('./item')
const access = require('./access')
const toHex = require('./util/toHex')
const {promisify} = require('util')

class HdWallet {
    constructor({mnemonic, transport, storage, name} = {}) {
        // if mnemonic = null, a random keypair will be generated
        this.masterKeys = generateMasterKeys(mnemonic)
        this.items = {}
        this.transport = wrapTransport(transport)
        this.storage = storage
        this.name = name
    }

    setTransport(transport) {
        this.transport = wrapTransport(transport)
    }
    setStorage(storage) {
        this.storage = storage
    }

    createItem() {
        const itemIdentity = item.keys.generate(this.masterKeys.item)
        this.items[itemIdentity.hash] = itemIdentity
        return itemIdentity.hash
    }

    requestAccess(itemHash) {
        const accessKeypair = access.keys.generate(this.masterKeys.access, itemHash)
        return accessKeypair.publicKey
    }

    async giveAccess(itemHash, recipientPublicKey) {
        let itemIdentity = this.items[itemHash]
        if (!itemIdentity) {
            itemIdentity = item.keys.recoverFromHash(this.masterKeys.item, itemHash)
        }
        const accessKeypair = access.keys.generate(this.masterKeys.access, itemHash)
        const envelope = access.give(itemIdentity.seed, recipientPublicKey, accessKeypair)
        // Send the envelope to the recipient
        await this.transport.accessKey.post(toHex(itemHash), envelope)
    }

    async getAccess(itemHash) {
        const accessKeypair = access.keys.generate(this.masterKeys.access, itemHash)
        const envelopes = await this.transport.accessKey.get(toHex(itemHash))
        for (const envelope of envelopes) {
            const itemSeed = access.get(envelope, accessKeypair)
            if (itemSeed) {
                this.items[itemHash] = item.keys.generateFromSeed(itemSeed)
                return
            }
        }
        throw Error('No valid key found')
    }

    async sendMessage(itemHash, text) {
        if (!this.items[itemHash]) throw Error('Chat keys not available')
        const payload = item.chat.sendMessage(text, this.name, this.items[itemHash])
        await this.transport.chatMessage.post(toHex(itemHash), payload)
    }

    async getMessages(itemHash) {
        if (!this.items[itemHash]) throw Error('Chat keys not available')
        const payloads = await this.transport.chatMessage.get(toHex(itemHash))
        return payloads
            .map(payload => item.chat.openMessage(payload, this.items[itemHash]))
            .filter(message => message)     
    }

    joinChat(itemHash, callback) {
        if (!this.items[itemHash]) throw Error('Chat keys not available')
        this.transport.chatMessage.sub(toHex(itemHash), (payload) => {
            const message = item.chat.openMessage(payload, this.items[itemHash])
            callback(message)
        })
    }
}

function wrapTransport(transport) {
    const handler = (resolve, reject) => (res) => {
        resolve(res)
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