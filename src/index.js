const bip39 = require('bip39')
const nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')

const {concatUintArrays, toUint8Array, hardenedKeyNonce} = require('./util')

/**
 * Constants
 */
const itemNonceLength = 8 // Reference values: 8 >= length <= 16
const splitChypherCharacter = "."; // MUST NOT be a base64 character

/**
* =========
* HD WALLET
* =========
*/

/**
* Generate mnemonic, returns string with mnemonic words
* @return {String}, for example
* mnemonic = 'thumb add muffin parent field people super firm club network thumb cancel'
*/
function generateMnemonic() {
    return bip39.generateMnemonic()
}

/**
* Generate first level masterKeys
* @argument {String} mnemonic
*/
function generateMasterKeys(mnemonic) {
    if (!mnemonic) mnemonic = generateMnemonic()
    // 64Bytes buffer seed derived from the mnemonic
    const seedBuffer = bip39.mnemonicToSeed(mnemonic)
    const bindings = [
        { nonce: 0, key: 'token' },
        { nonce: 1, key: 'item' },
        { nonce: 2, key: 'chat' },
    ]
    const masterKeys = {}
    bindings.forEach(({nonce, key}) => {
        masterKeys[key] = nacl.hash(concatUintArrays(
            seedBuffer, 
            toUint8Array(hardenedKeyNonce(nonce))
        ))
    })
    return masterKeys
}


/**
 * Generates item keys from item seed.
 * 
 * Used directly when a NON creator of the item identity
 * wants to access the its chat.
 * @param {Uint8Array} itemSeed 
 * @return {Object}
 */
function generateItemKeysFromSeed(itemSeed) {
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
function generateItemKeysFromNonce(masterKeyItems, itemNonce) {
    const itemSeed = nacl.hash(concatUintArrays(masterKeyItems, itemNonce))
    const itemIdentity = generateItemKeysFromSeed(itemSeed)
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
function generateItemKeys(masterKeyItems) {
    const itemNonce = nacl.randomBytes(itemNonceLength)
    // itemSeed is 64 bytes
    return generateItemKeysFromNonce(masterKeyItems, itemNonce)
}

/**
 * Recovers an item identity provided its hash. 
 * 
 * Used when a user that created an item identity wants to recover it.
 * @param {Uint8Array} masterKeyItems 
 * @param {Uint8Array} itemHash
 */
function recoverItemKeysFromHash(masterKeyItems, itemHash) {
    const itemNonce = itemHash.slice(32 - itemNonceLength)
    return generateItemKeysFromNonce(masterKeyItems, itemNonce)
}

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


/**
 * Encrypts utf-8 message, can be a stringified json.
 * Uses authentication encryption.
 * @param {String} messageUtf8 must be a utf-8 string
 * @param {Uint8Array} key 
 * @return {String} envelop, concatenation of the chyper text and the nonce base64 encoded
 */
function encrypt(messageUtf8, key) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const message = nacl.util.decodeUTF8(messageUtf8);
  // Encrypt
  const box = nacl.secretbox(message, nonce, key);
  // Concat
  let nonceEncoded = nacl.util.encodeBase64(nonce);
  let cypherText = nacl.util.encodeBase64(box);
  return [nonceEncoded, cypherText].join(splitChypherCharacter)
}

/**
 * Decrypts envelope
 * @param {String} envelope Must be a concatenation of the chyper text and the nonce base64 encoded
 * using the predefined splitChypherCharacter
 * @param {Uint8Array} key 
 * @return {String} utf-8 message
 */
function decrypt(envelope, key) {
  // Split
  const [nonceEncoded, cypherText] = envelope.split(splitChypherCharacter)
  const nonce = nacl.util.decodeBase64(nonceEncoded);
  const box = nacl.util.decodeBase64(cypherText);
  // Decrypt
  let message = nacl.secretbox.open(box, nonce, key);
  return nacl.util.encodeUTF8(message);
}

module.exports = {
    generateMnemonic,
    generateMasterKeys,
    generateItemKeys,
    generateItemKeysFromSeed,
    recoverItemKeysFromHash,
    sign,
    verify,
    encrypt,
    decrypt
}