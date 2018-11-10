const expect = require('chai').expect;
const symetric = require('./symetric')
const {generateMasterKeys} = require('../')
const keys = require('../item/keys')

describe('Crypt: symetric encryption module', () => {
    let itemIdentity;
    before(() => {
        const privateKey = "0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709"
        const masterKeys = generateMasterKeys(privateKey)
        itemIdentity = keys.generate(masterKeys.item)
    })
    it('Chat participants should use the item\'s identity to encrypt messages', () => {
        const messageUtf8 = 'secret message' // must be utf-8
        const encryptedEnvelope = symetric.encrypt(messageUtf8, itemIdentity.chatKey)
        const _messageUtf8 = symetric.decrypt(encryptedEnvelope, itemIdentity.chatKey)
        expect(_messageUtf8).to.equal(messageUtf8)
    })
})