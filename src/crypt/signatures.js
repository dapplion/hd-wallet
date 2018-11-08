const nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')

/**
 * Signs message of arbitrary length. 
 * With .detached the signature does not contain the message and is always 64bytes
 * @param {Uint8Array} messageUtf8 
 * @param {Uint8Array} secretKey 
 * @return {Uint8Array} Signature (64 bytes)
 */
function sign(messageUtf8, secretKey) {
    const message = nacl.util.decodeUTF8(messageUtf8)
    return nacl.sign.detached(message, secretKey)
}

/**
 * Verify signature. 
 * With .detached the signature does not contain the message and is always 64bytes
 * @param {Uint8Array} messageUtf8 
 * @param {Uint8Array} secretKey 
 * @return {Uint8Array} Signature (64 bytes)
 */
function verify(messageUtf8, signature, publicKey) {
    const message = nacl.util.decodeUTF8(messageUtf8)
    return nacl.sign.detached.verify(message, signature, publicKey)
}

module.exports = {
    sign,
    verify
}
