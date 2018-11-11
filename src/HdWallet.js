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
            if (!privateKey) throw Error('masterKeys and privateKey are not defined')
            masterKeys = generateMasterKeys(privateKey)
        }
        return masterKeys
    }
    function getItemIdentity(itemHashHex) {
        return items[itemHashHex]
    }
    function setItemIdentity(itemHashHex, itemIdentity) {
        items[itemHashHex] = itemIdentity
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
        const itemHashHex = util.toHex(itemIdentity.hash)
        setItemIdentity(itemHashHex, itemIdentity)
        return itemHashHex 
    }

    function requestAccess(privateKey, itemHashHex) {
        if (typeof itemHashHex !== 'string') throw Error('itemHashHex must be a string')
        const masterKeys = getMasterKeys(privateKey)
        const itemHash = util.toUint8Array(itemHashHex)
        const accessKeypair = access.keys.generate(masterKeys.access, itemHash)
        return util.toHex(accessKeypair.publicKey)
    }

    async function giveAccess(privateKey, itemHashHex, recipientPublicKeyHex) {
        if (typeof itemHashHex !== 'string') throw Error('itemHashHex must be a string')
        if (typeof recipientPublicKeyHex !== 'string') throw Error('recipientPublicKeyHex must be a string')

        const masterKeys = getMasterKeys(privateKey)
        const itemHash = util.toUint8Array(itemHashHex)
        const recipientPublicKey = util.toUint8Array(recipientPublicKeyHex)
        let itemIdentity = getItemIdentity(itemHashHex)
        if (!itemIdentity) {
            itemIdentity = item.keys.recoverFromHash(masterKeys.item, itemHash)
        }
        const accessKeypair = access.keys.generate(masterKeys.access, itemHash)
        const envelope = access.give(itemIdentity.seed, recipientPublicKey, accessKeypair)
        // Send the envelope to the server
        return await transport.subscribeToChat(itemHashHex, envelope, null)
    }

    // Join chat, 

    function getItemIdentityFromAccessKeys(privateKey, itemHashHex, accessKeys) {
        if (typeof itemHashHex !== 'string') throw Error('itemHashHex must be a string')
        const masterKeys = getMasterKeys(privateKey)
        const itemHash = util.toUint8Array(itemHashHex)
        const accessKeypair = access.keys.generate(masterKeys.access, itemHash)
        for (const accessKey of accessKeys) {
            const itemSeed = access.get(accessKey, accessKeypair)
            // If decryption fails, `access.get` returns null
            if (itemSeed) return item.keys.generateFromSeed(itemSeed)
        }
    }

    async function sendMessage(itemHashHex, text, user) {
        if (typeof itemHashHex !== 'string') throw Error('itemHashHex must be a string')
        const itemIdentity = getItemIdentity(itemHashHex)
        if (!itemIdentity) throw Error('Chat keys not available')
        const itemHash = util.toUint8Array(itemHashHex)
        const payload = item.chat.sendMessage(text, user || name, itemIdentity)
        const res = await transport.newChatMessage(toHex(itemHash), payload)
        return res
    }

    async function joinChat(privateKey, itemHashHex, callback) {
        if (typeof itemHashHex !== 'string') throw Error('itemHashHex must be a string')
        const itemHash = util.toUint8Array(itemHashHex)
        // Get keys to decrypt the messages
        if (!getItemIdentity(itemHashHex)) {
            // Will return null if the user is not the seeker
            const masterKeys = getMasterKeys(privateKey)
            const itemIdentity = item.keys.recoverFromHash(masterKeys.item, itemHash)
            if (itemIdentity) items[itemHashHex] = itemIdentity
            setItemIdentity(itemHashHex, itemIdentity)
        }
        
        const chatCallback = (chatObject) => {
            const {accessKeys, messages} = chatObject
            // chatObject = { accessKeys: [], messages: [] }
            if (!items[itemHashHex] && accessKeys) {
                const itemIdentity = getItemIdentityFromAccessKeys(privateKey, itemHashHex, accessKeys)
                if (itemIdentity) setItemIdentity(itemHashHex, itemIdentity)
                else throw Error('Chat keys not available')
            }
            if (messages) {
                const itemIdentity = getItemIdentity(itemHashHex)
                callback(messages
                    .map(payload => item.chat.openMessage(payload, itemIdentity))
                    .filter(message => message)
                )
            }
        }
        return await transport.subscribeToChat(itemHashHex, null, chatCallback)
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