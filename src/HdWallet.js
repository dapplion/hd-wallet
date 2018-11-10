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
    transport: _transport, 
    storage: _storage, 
    name
} = {}) {
    // if mnemonic = null, a random keypair will be generated
    // const masterKeys = generateMasterKeys(mnemonic)
    let masterKeys
    const items = {}
    let transport = wrapTransport(_transport)
    let storage = _storage

    // Internal methods
    function getMasterKeys(privateKey) {
        if (!masterKeys) {
            if (!privateKey) throw Error('masterKeys are not defined, and privateKey is not defined')
            masterKeys = generateMasterKeys(privateKey)
        }
        return masterKeys
    }

    // Setters
    function setTransport(_transport) {
        transport = wrapTransport(_transport)
    }
    function setStorage(_storage) {
        storage = _storage
    }
    function setMasterKeys(privateKey) {
        getMasterKeys(privateKey)
    }
    
    // External methods
    function createItem(privateKey) {
        const masterKeys = getMasterKeys(privateKey)
        const itemIdentity = item.keys.generate(masterKeys.item)
        items[itemIdentity.hash] = itemIdentity
        return itemIdentity.hash
    }

    function requestAccess(privateKey, itemHash) {
        const masterKeys = getMasterKeys(privateKey)
        const accessKeypair = access.keys.generate(masterKeys.access, itemHash)
        return accessKeypair.publicKey
    }

    async function giveAccess(privateKey, itemHash, recipientPublicKey) {
        const masterKeys = getMasterKeys(privateKey)
        let itemIdentity = items[itemHash]
        if (!itemIdentity) {
            itemIdentity = item.keys.recoverFromHash(masterKeys.item, itemHash)
        }
        const accessKeypair = access.keys.generate(masterKeys.access, itemHash)
        const envelope = access.give(itemIdentity.seed, recipientPublicKey, accessKeypair)
        // Send the envelope to the server
        return await transport.subscribeToChat(toHex(itemHash), envelope, null)
    }

    // Join chat, 

    function getItemIdentityFromAccessKeys(privateKey, itemHash, accessKeys) {
        const masterKeys = getMasterKeys(privateKey)
        const accessKeypair = access.keys.generate(masterKeys.access, itemHash)
        for (const accessKey of accessKeys) {
            const itemSeed = access.get(accessKey, accessKeypair)
            // If decryption fails, `access.get` returns null
            if (itemSeed) return item.keys.generateFromSeed(itemSeed)
        }
    }

    async function sendMessage(itemHash, text) {
        if (!items[itemHash]) throw Error('Chat keys not available')
        const payload = item.chat.sendMessage(text, name, items[itemHash])
        const res = await transport.newChatMessage(toHex(itemHash), payload)
        return res
    }

    async function joinChat(privateKey, itemHash, callback) {
        // Get keys to decrypt the messages
        if (!items[itemHash]) {
            // Will return null if the user is not the seeker
            const masterKeys = getMasterKeys(privateKey)
            const itemIdentity = item.keys.recoverFromHash(masterKeys.item, itemHash)
            if (itemIdentity) items[itemHash] = itemIdentity
        }
        
        const chatCallback = (chatObject) => {
            const {accessKeys, messages} = chatObject
            // chatObject = { accessKeys: [], messages: [] }
            if (!items[itemHash] && accessKeys) {
                const itemIdentity = getItemIdentityFromAccessKeys(privateKey, itemHash, accessKeys)
                if (itemIdentity) items[itemHash] = itemIdentity
                else throw Error('Chat keys not available')
            }
            if (messages) {
                callback(messages
                    .map(payload => item.chat.openMessage(payload, items[itemHash]))
                    .filter(message => message)
                )
            }
        }
        return await transport.subscribeToChat(toHex(itemHash), null, chatCallback)
    }

    return {
        // static properties
        version: '0.1.0-commit#dcceb2',
        util,
        name,
        transport,
        storage,
        // setters
        setTransport,
        setStorage,
        setMasterKeys,
        // methods
        createItem,
        requestAccess,
        giveAccess,
        sendMessage,
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
        subscribeToChat: (itemHash, accessKeys, cb) => new Promise((resolve, reject) => {
            if (cb) transport.on('chatChanged', chatObject => {
                cb(chatObject)
            })
            const data = {itemHash, accessKeys}
            transport.emit('subscribeToChat', data, handler(resolve, reject))
        }),
        newChatMessage: (itemHash, message) => new Promise((resolve, reject) => {
            const data = {itemHash, message}
            transport.emit('newChatMessage', data, handler(resolve, reject))
        }),
    }
}

module.exports = HdWallet