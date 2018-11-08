const nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')
const asymetric = require('../crypt/asymetric')

// Base64 reserved characters: "+", "/", "="
const splitPayloadCharacter = ":"; // MUST NOT be a base64 character

function give(keyMessage, recipientPublicKey, myKeypair) {
    const envelope = asymetric.encrypt(keyMessage, recipientPublicKey, myKeypair.secretKey)
    const publicKeyEncoded = nacl.util.encodeBase64(myKeypair.publicKey);
    return [envelope, publicKeyEncoded].join(splitPayloadCharacter)
}

function get(payload, myKeypair) {
    const [envelope, publicKeyEncoded] = payload.split(splitPayloadCharacter)
    const publicKey = nacl.util.decodeBase64(publicKeyEncoded);
    return asymetric.decrypt(envelope, publicKey, myKeypair.secretKey, {output: 'Uint8Array'})
}


module.exports = {
    keys: require('./keys'),
    give,
    get
}