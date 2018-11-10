const expect = require('chai').expect;
const keys = require('./keys')
const {generateMasterKeys} = require('../')

describe('Item Keys module: Item identity use flow', () => {
    const privateKey = "0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709"
    const seekerMasterKeys = generateMasterKeys(privateKey)
    let itemIdentity

    it('The Seeker should generate a new item identity', () => {
        itemIdentity = keys.generate(seekerMasterKeys.item)
        expect(itemIdentity).to.be.a('object')
        const properties = [
            { key: 'publicKey', byteLength: 32 },
            { key: 'secretKey', byteLength: 64 },
            { key: 'chatKey', byteLength: 32 },
            { key: 'seed', byteLength: 64 },
            { key: 'hash', byteLength: 32 }
        ]
        for (const property of properties) {
            expect(itemIdentity).to.have.property(property.key)
            expect(itemIdentity[property.key]).to.be.a('Uint8Array')
            expect(itemIdentity[property.key]).to.have.length(property.byteLength, `${property.key} has wrong byte length`)
        }
    })

    // Now the seeker will send the item seed encrypted to the provider,
    // who should be able to recover the same item identity with it

    it('The provider should be able to recover the same item identity and keys', () => {
        const itemSeed = itemIdentity.seed

        const _itemIdentity = keys.generateFromSeed(itemSeed)
        expect(_itemIdentity.secretKey.toString('hex')).to.equal(itemIdentity.secretKey.toString('hex'))
        expect(_itemIdentity.chatKey.toString('hex')).to.equal(itemIdentity.chatKey.toString('hex'))
    })

    // In the case the seeker loses his localCache, should be able
    // to recover the item identity slicing the nonce from the itemHash
    // published on the blockchain and from his masterKeyItem

    it('The seeker should be able to recover the same item identity and keys', () => {
        const _itemIdentity = keys.recoverFromHash(seekerMasterKeys.item, itemIdentity.hash)
        expect(_itemIdentity.secretKey.toString('hex')).to.equal(itemIdentity.secretKey.toString('hex'))
        expect(_itemIdentity.chatKey.toString('hex')).to.equal(itemIdentity.chatKey.toString('hex'))
    })
});