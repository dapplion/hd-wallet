const nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')
const symetric = require('../crypt/symetric')
const signatures = require('../crypt/signatures')

// Base64 reserved characters: "+", "/", "="
const splitPayloadCharacter = ":"; // MUST NOT be a base64 character

function sendMessage(text, user, itemIdentity) {
    const messageObject = {
        text,
        user,
        timestamp: Math.floor(Date.now()/1000)
    }
    const {chatKey, secretKey, publicKey} = itemIdentity
    const envelope = symetric.encrypt(JSON.stringify(messageObject), chatKey)
    const signature = signatures.sign(envelope, secretKey)
    const signatureEncoded = nacl.util.encodeBase64(signature);
    const publicKeyEncoded = nacl.util.encodeBase64(publicKey);
    // Make sure everything is defined
    if (!envelope) throw Error('envelope is not defined')
    if (!signatureEncoded) throw Error('signatureEncoded is not defined')
    if (!publicKeyEncoded) throw Error('publicKeyEncoded is not defined')
    return [envelope, signatureEncoded, publicKeyEncoded].join(splitPayloadCharacter)
    // clientTransport.send('chatMessage', payload)
}

function verifyMessage(payload) {
    // Parse the payload
    const [envelope, signatureEncoded, publicKeyEncoded] = payload.split(splitPayloadCharacter)
    const signature = nacl.util.decodeBase64(signatureEncoded);
    const publicKey = nacl.util.decodeBase64(publicKeyEncoded);
    // Verify the signature
    const isValid = signatures.verify(envelope, signature, publicKey);
    if (isValid) {
        return publicKeyEncoded
    } else {
        return null
    }
}
// serverTransport.on('chatMessage', (payload => {
//     const publicKey = verifyMessage(payload)
//     if (publicKey) {
//         // Verify public key corresponds to a valid item
//         transport.to(publicKey).emit('chatMessage', payload)
//         storage.store(payload)
//     }
// }))

// clientTransport.on('chatMessage', (payload => {
//     const messageObject = openMessage(payload, itemSeed)
//     if (messageObject) {
//         render(messageObject)
//     }
// }))

function openMessage(payload, itemIdentity) {
    // Parse the payload
    const [envelope, signatureEncoded, publicKeyEncoded] = payload.split(splitPayloadCharacter)
    if (!envelope) throw Error('payload does not contain envelope')
    if (!signatureEncoded) throw Error('payload does not contain signatureEncoded')
    if (!publicKeyEncoded) throw Error('payload does not contain publicKeyEncoded')
    let signature
    try {
        signature = nacl.util.decodeBase64(signatureEncoded);
    } catch(e) {
        e.message = `Error decoding signature from Base64 (${e.message}), signature: ${signature}`
        throw e
    }
    let _publicKey
    try {
        _publicKey = nacl.util.decodeBase64(publicKeyEncoded);
    } catch(e) {
        e.message = `Error decoding publicKey from Base64 (${e.message}), signature: ${_publicKey}`
        throw e
    }
    // Verify the signature
    const isValid = signatures.verify(envelope, signature, _publicKey);
    if (!isValid) {
        return null
    }
    const {chatKey, publicKey} = itemIdentity
    // Verify that the signature was done by the same item identity
    if (publicKey.toString('hex') !== _publicKey.toString('hex')) {
        return null
    }
    const messageObject = symetric.decrypt(envelope, chatKey)
    // Verify that the decryption was successful, messageObject = null if not
    if (!messageObject) {
        return null
    }
    return JSON.parse(messageObject)
}

module.exports = {
    sendMessage,
    verifyMessage,
    openMessage
}