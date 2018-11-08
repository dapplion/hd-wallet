const nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')
const {concatUintArrays} = require('../util')

/**
 * Generates a new item identity
 * 
 * Used when a user creates a new item.
 * @param {Uint8Array} masterKeyItems 
 * @param {Uint8Array} itemHash
 * @return {Object} keypair: {publicKey, secretKey}                                                                   secretKey
 */
function generate(masterKeyAccess, itemHash) {
    const itemAccessSeed = nacl.hash(concatUintArrays(masterKeyAccess, itemHash))
    // itemAccessSeed is 64 bytes
    const keyPair = nacl.box.keyPair.fromSecretKey(itemAccessSeed.slice(0, 32))
    return keyPair
}

module.exports = {
    generate,
}
