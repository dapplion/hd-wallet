const expect = require('chai').expect;
const hdWallet = require('../src/index')



describe('hd wallet', () => {
    it('should generate a mnemonic string', () => {
        const _mnemonic = hdWallet.generateMnemonic()
        expect(_mnemonic).to.be.a('string')
        expect(_mnemonic.split(' ')).to.have.length(12)
    });

    // Use a fix mnemonic for test consinstency
    const mnemonic = 'thumb add muffin parent field people super firm club network thumb cancel'

    it('should generate 3 master keys', () => {
        const masterKeys = hdWallet.generateMasterKeys(mnemonic)
        expect(Object.values(masterKeys)).to.have.length(3)
        for (const masterKey of Object.values(masterKeys)) {
            expect(masterKey).to.be.a('Uint8Array')
            expect(masterKey).to.have.length(64)
        }
    });

    describe('Item identity use flow', () => {
        const seekerMasterKeys = hdWallet.generateMasterKeys()
        let itemIdentity

        it('The Seeker should generate a new item identity', () => {
            itemIdentity = hdWallet.generateItemKeys(seekerMasterKeys.item)
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

            const _itemIdentity = hdWallet.generateItemKeysFromSeed(itemSeed)
            expect(_itemIdentity.secretKey.toString('hex')).to.equal(itemIdentity.secretKey.toString('hex'))
            expect(_itemIdentity.chatKey.toString('hex')).to.equal(itemIdentity.chatKey.toString('hex'))
        })

        // In the case the seeker loses his localCache, should be able
        // to recover the item identity slicing the nonce from the itemHash
        // published on the blockchain and from his masterKeyItem

        it('The seeker should be able to recover the same item identity and keys', () => {
            const _itemIdentity = hdWallet.recoverItemKeysFromHash(seekerMasterKeys.item, itemIdentity.hash)
            expect(_itemIdentity.secretKey.toString('hex')).to.equal(itemIdentity.secretKey.toString('hex'))
            expect(_itemIdentity.chatKey.toString('hex')).to.equal(itemIdentity.chatKey.toString('hex'))
        })

        // Once the seeker or the provider have access to the item identity,
        // they can use it to encrypt messages using the chat key.


        // Once the seeker of the provider have encrypted an envelop, 
        // they should use the item identity to sign envelopes 
        // so the mail server can verify that they have access to a valid item
        // and store their messages.

    })
});