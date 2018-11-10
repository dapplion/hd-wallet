const bip39 = require('./bip39')
const nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')

const {concatUintArrays, toUint8Array, hardenedKeyNonce} = require('./util')

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
        { nonce: 2, key: 'access' },
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
 * Chat implementation
 * 
 * 1. Message object with metadata necessary to be shown in the app
 * The length of the text field MUST be limited to avoid problems
 * at the client and server level.
 * 
 * messageObject = {
 *   text: 'Hi where can we meet?',
 *   user: '0x7422abbb2...',
 *   timestamp: 13442234234
 * }
 * 
 * 2. The message object is stringified and encrypted.
 * 
 * envelope = encrypt(JSON.stringify(messageObject), chatKey)
 * 
 * 3. The envelope is signed and the signature is concatenated
 * to the message plus some metadata. The mailServer will verify
 * that the publicKey is the actual signer and that it corresponds
 * to a valid item in the hashtag.
 * 
 * signature = sign.detached(envelope, privateKey)
 * payload = envelope || signature || publicKey
 */



// Next challenge:
// - How does the user know that is concerned in a specific chat?
// - How to handle the keys and subscribe to messages in the background?
// - How to connect the chat manager with the blockchain and the api?


module.exports = {
    generateMnemonic,
    generateMasterKeys
}