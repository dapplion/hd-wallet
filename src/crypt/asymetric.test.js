const expect = require('chai').expect;
const asymetric = require('./asymetric')
const {generateMasterKeys} = require('../')
const item = require('../item')
const access = require('../access')

describe('Crypt: asymetric encryption module', () => {
    let itemHash;
    let seekerAccessKeypair
    let providerAccessKeypair

    before(() => {
        const privateKeySeeker = "0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709"
        const privateKeyProvider = "0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098"
        const seekerMasterKeys = generateMasterKeys(privateKeySeeker)
        const providerMasterKeys = generateMasterKeys(privateKeyProvider)
        itemHash = item.keys.generate(seekerMasterKeys.item).hash
        seekerAccessKeypair = access.keys.generate(seekerMasterKeys.access, itemHash)
        providerAccessKeypair = access.keys.generate(providerMasterKeys.access, itemHash)
    })
    it('Seeker should encrypt and envelop with the provider\'s key', () => {
        const messageUtf8 = 'secret message' // must be utf-8
        // On the seeker's browser instance encrypt using seeker's private key to authenticate
        const encryptedEnvelope = asymetric.encrypt(messageUtf8, providerAccessKeypair.publicKey, seekerAccessKeypair.secretKey)
        // On the provider's browser instance decrypt using provider's private key
        const _messageUtf8 = asymetric.decrypt(encryptedEnvelope, seekerAccessKeypair.publicKey, providerAccessKeypair.secretKey)
        // However, the seeker is able to decrypt the message using his credentials
        // const _messageUtf8 = asymetric.decrypt(encryptedEnvelope, providerAccessKeypair.publicKey, seekerAccessKeypair.secretKey)
        expect(_messageUtf8).to.equal(messageUtf8)
    })
})