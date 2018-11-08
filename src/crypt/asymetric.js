const nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')

// Base64 reserved characters: "+", "/", "="
const splitChypherCharacter = "."; // MUST NOT be a base64 character

/**
 * Encrypts utf-8 message, can be a stringified json.
 * Uses authentication encryption.
 * @param {String} messageUtf8 must be a utf-8 string
 * @param {Uint8Array} key 
 * @return {String} envelop, concatenation of the chyper text and the nonce base64 encoded
 */
function encrypt(messageUtf8, recipientPublicKey, mySecretKey) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  let message
  if (messageUtf8 instanceof Uint8Array) {
    message = messageUtf8
  } else if (typeof messageUtf8 === 'string') {
    message = nacl.util.decodeUTF8(messageUtf8);
  } else {
    throw Error(`Unknown type for messageUtf8: ${typeof messageUtf8}`)
  }
  if (!(recipientPublicKey instanceof Uint8Array)) {
    throw Error(`recipientPublicKey must be type Uint8Array: ${recipientPublicKey}`)
  }
  if (!(mySecretKey instanceof Uint8Array)) {
    throw Error(`mySecretKey must be type Uint8Array: ${mySecretKey}`)
  }
  // Encrypt
  const box = nacl.box(message, nonce, recipientPublicKey, mySecretKey)
  // Concat
  const nonceEncoded = nacl.util.encodeBase64(nonce);
  const boxEncoded = nacl.util.encodeBase64(box);
  return [nonceEncoded, boxEncoded].join(splitChypherCharacter)
}

/**
 * Decrypts envelope
 * @param {String} envelope Must be a concatenation of the chyper text and the nonce base64 encoded
 * using the predefined splitChypherCharacter
 * @param {Uint8Array} key 
 * @return {String} utf-8 message
 */
function decrypt(envelope, senderPublicKey, mySecretKey, options = {}) {
      if (typeof envelope !== 'string') {
        throw Error(`envelope must be type string: ${typeof envelope}`)
      }
      if (!(senderPublicKey instanceof Uint8Array)) {
        throw Error(`senderPublicKey must be type Uint8Array: ${senderPublicKey}`)
      }
      if (!(mySecretKey instanceof Uint8Array)) {
        throw Error(`mySecretKey must be type Uint8Array: ${mySecretKey}`)
      }
  // Split
  const [nonceEncoded, boxEncoded] = envelope.split(splitChypherCharacter)
  const nonce = nacl.util.decodeBase64(nonceEncoded);
  const box = nacl.util.decodeBase64(boxEncoded);
  // Decrypt
  const message = nacl.box.open(box, nonce, senderPublicKey, mySecretKey)
  if (!message) throw Error('Error decrypting box')
  if (options.output === 'Uint8Array') {
    return message
  } else {
    return nacl.util.encodeUTF8(message);
  }
}

module.exports = {
  encrypt,
  decrypt
}