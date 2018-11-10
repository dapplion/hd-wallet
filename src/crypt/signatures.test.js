const expect = require('chai').expect;
const signatures = require('./signatures')
const {generateMasterKeys} = require('../')
const keys = require('../item/keys')

describe('Crypt: signatures module', () => {
    let itemIdentity;
    before(() => {
        const privateKey = "0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709"
        const masterKeys = generateMasterKeys(privateKey)
        itemIdentity = keys.generate(masterKeys.item)
    })
    
    it('Chat participants should use the item\'s identity to sign encrypted envelopes', () => {
        const messageUtf8 = 'encrypted_envelope' // must be utf-8

        const signature = signatures.sign(messageUtf8, itemIdentity.secretKey)
        const isValid = signatures.verify(messageUtf8, signature, itemIdentity.publicKey)
        expect(isValid).to.be.true
    })
})