const nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')
const {concatUintArrays} = require('../util')

const itemNonceLength = 8 // Reference values: 8 >= length <= 16

/**
 * Generates item keys from item seed.
 * 
 * Used directly when a NON creator of the item identity
 * wants to access the its chat.
 * @param {Uint8Array} itemSeed 
 * @return {Object}
 */
function generateFromSeed(itemSeed) {
    // First part of the seed is for publicKey pair
    const publicKeyPairSeed = itemSeed.slice(0, 32)
    const publicKeyPair = nacl.sign.keyPair.fromSeed(publicKeyPairSeed)
    // Second part of the seed is for Asymetric chat encryption
    const asymetricKeySeed = itemSeed.slice(32)
    return {
        publicKey: publicKeyPair.publicKey,
        secretKey: publicKeyPair.secretKey,
        chatKey: asymetricKeySeed
    }
}

/**
 * Generates item keys from the item nonce
 * 
 * Used directly when the creator of the item identity 
 * wants to recover access to its chat.
 * @param {Uint8Array} masterKeyItems 
 * @param {Uint8Array} itemNonce 
 * @return {Object}
 */
function generateFromNonce(masterKeyItems, itemNonce) {
    const itemSeed = nacl.hash(concatUintArrays(masterKeyItems, itemNonce))
    const itemIdentity = generateFromSeed(itemSeed)
    return {
        ...itemIdentity,
        seed: itemSeed,
        hash: concatUintArrays(itemIdentity.publicKey.slice(0, (32 - itemNonceLength)), itemNonce),
    }
}

/**
 * Generates a new item identity
 * 
 * Used when a user creates a new item.
 * @param {Uint8Array} masterKeyItems 
 */
function generate(masterKeyItems) {
    const itemNonce = nacl.randomBytes(itemNonceLength)
    // itemSeed is 64 bytes
    return generateFromNonce(masterKeyItems, itemNonce)
}

/**
 * Recovers an item identity provided its hash. 
 * 
 * Used when a user that created an item identity wants to recover it.
 * @param {Uint8Array} masterKeyItems 
 * @param {Uint8Array} itemHash
 */
function recoverFromHash(masterKeyItems, itemHash) {
    const itemNonce = itemHash.slice(32 - itemNonceLength)
    const itemIdentity = generateFromNonce(masterKeyItems, itemNonce)
    if (itemHash.toString('hex') !== itemIdentity.hash.toString('hex')) {
        throw Error('You cannot recover the identity of an item you didn\'t created')
    }
    return itemIdentity
}

module.exports = {
    generateFromSeed,
    generateFromNonce,
    generate,
    recoverFromHash
}
