const bip39 = require('bip39')
const nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')

// Returns string with mnemonic word
// thumb add muffin parent field people super firm club network thumb cancel
// const mnemonic = bip39.generateMnemonic()
const mnemonic = 'family urge suspect minor shove evil cram nothing festival couple charge whale'

// console.log(mnemonic)

// 64Bytes buffer seed derived from the mnemonic
const seedBuffer = bip39.mnemonicToSeed(mnemonic)

const masterKeys = {
    master: seedBuffer.buffer,
    token: nacl.hash(concatUintArrays(seedBuffer, toUA(hardenedKeyNonce(0)))),
    item: nacl.hash(concatUintArrays(seedBuffer, toUA(hardenedKeyNonce(1)))),
    chat: nacl.hash(concatUintArrays(seedBuffer, toUA(hardenedKeyNonce(2))))
}

console.log('\n Master keys \n==========')
printObject(masterKeys)

// itemHashes generated with:
//   console.log(new Buffer.from(nacl.randomBytes(32).buffer).toString('hex'))
const itemHashes = [
    '0xf2e968158839830cfcfdcf2b4df6f18082941d9d8e7b122807e3e216949a7de5',
    '0x936e2e69d84121e8f08e515450ed110800c8a7ec7954d64196762930be28b13e',
    '0xce2a10b143ed6ada2b78abe9e1bcdf2fd486e141ec872833ddd6636bf38c8a33'
]

const itemKeys = {}
itemHashes.forEach((itemHash, i) => {
    itemKeys[`itemKey${i}`] = nacl.hash(concatUintArrays(masterKeys.item, toUA(itemHash)))
})
console.log('\n Item Keys \n==========')
printObject(itemKeys)

// Item derivated keys
const asymetricKeySeed = itemKeys.itemKey0.slice(0, 32) // First part of the seed
const publicKeyPairSeed = itemKeys.itemKey0.slice(32) // Second part of the seed

// 1. Item identity (publicKey pair)
const publicKeyPair = nacl.sign.keyPair.fromSeed(publicKeyPairSeed)
// Test it
console.log('\nTesting "publicKeyPair" with Signatures')
const messageUtf8 = 'hello chat'
const message = nacl.util.decodeUTF8(messageUtf8)
// With .detached the signature does not contain the message and is always 64bytes
const signature = nacl.sign.detached(message, publicKeyPair.secretKey)
const valid = nacl.sign.detached.verify(message, signature, publicKeyPair.publicKey)
console.log('signature is valid: '+valid)

// 2. Chat key (Secret-key authenticated encryption)
const chatKey = asymetricKeySeed
// Test it
console.log('\nTesting "Chat key" with Secret-key authenticated encryption')
const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
const box = nacl.secretbox(message, nonce, chatKey)
console.log(messageUtf8, ' = ', nacl.util.encodeUTF8(nacl.secretbox.open(box, nonce, chatKey)))

// var enc = nacl.util.encodeBase64,
//     dec = nacl.util.decodeBase64;





// utils

function hardenedKeyNonce(i) {
    // Typically the HD protocol uses indexes 
    // 0x00 to 0x7fffffff to generate normal keys and indexes
    // from 0x80000000 to 0xffffffff to generate hardened keys.
    return (parseInt('80000000', 16) + i).toString(16)
}

function printObject(obj) {
    Object.keys(obj).forEach(key => {
        console.log(key, nacl.util.encodeBase64(obj[key]))
    })
}

function toUA(data) {
    if (typeof data === 'number') return new Uint8Array([data])
    if (typeof data === 'string') {
        if (data.startsWith('0x')) data = data.slice(2)
        if (/^[0-9A-F]+$/i.test(data)) {
            // is hex
            return new Buffer.from(data, "hex")
        }
    }
}

function concatUintArrays(arrayOne, arrayTwo) {
    if (!(arrayOne instanceof Uint8Array)) throw Error('arrayOne is not an instance of Uint8Array')
    if (!(arrayTwo instanceof Uint8Array)) throw Error('arrayTwo is not an instance of Uint8Array')
    var mergedArray = new Uint8Array(arrayOne.length + arrayTwo.length);
    mergedArray.set(arrayOne);
    mergedArray.set(arrayTwo, arrayOne.length);
    return mergedArray
}

