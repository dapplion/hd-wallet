const {
    generateMnemonic,
    generateMasterKeys
} = require('./generateMasterKeys')
const item = require('./item')
const access = require('./access')
// Utils
const util = require('./util')

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
    generateMasterKeys,
    item,
    access,
    util,
    version: '0.1.0-commit#dcceb2'
}