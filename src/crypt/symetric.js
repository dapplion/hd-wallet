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
function encrypt(messageUtf8, key) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const message = nacl.util.decodeUTF8(messageUtf8);
  // Encrypt
  const box = nacl.secretbox(message, nonce, key);
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
function decrypt(envelope, key) {
  // Split
  const [nonceEncoded, boxEncoded] = envelope.split(splitChypherCharacter)
  const nonce = nacl.util.decodeBase64(nonceEncoded);
  const box = nacl.util.decodeBase64(boxEncoded);
  // Decrypt
  const message = nacl.secretbox.open(box, nonce, key);
  return nacl.util.encodeUTF8(message);
}

module.exports = {
  encrypt,
  decrypt
}