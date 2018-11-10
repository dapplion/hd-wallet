const expect = require('chai').expect;
const keys = require('./keys')
const {generateMasterKeys} = require('../')
const item = require('../item')

describe('Access Keys module: Item identity use flow', () => {
    const privateKeySeeker = "0x348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709"
    const privateKeyProvider = "0xd7325de5c2c1cf0009fac77d3d04a9c004b038883446b065871bc3e831dcd098"
    const seekerMasterKeys = generateMasterKeys(privateKeySeeker)
    const providerMasterKeys = generateMasterKeys(privateKeyProvider)
    let seekerKeypair
    let itemHash

    it('The Seeker should generate valid credentials', () => {
        itemHash = item.keys.generate(seekerMasterKeys.item).hash
        seekerKeypair = keys.generate(seekerMasterKeys.access, itemHash)
        expect(seekerKeypair).to.be.a('object')
        const properties = [
            { key: 'publicKey', byteLength: 32 },
            { key: 'secretKey', byteLength: 32 },
        ]
        for (const property of properties) {
            expect(seekerKeypair).to.have.property(property.key)
            expect(seekerKeypair[property.key]).to.be.a('Uint8Array')
            expect(seekerKeypair[property.key]).to.have.length(property.byteLength, `${property.key} has wrong byte length`)
        }
    })

    it('The Provider should generate valid credentials', () => {
        const providerKeypair = keys.generate(providerMasterKeys.access, itemHash)
        expect(providerKeypair).to.be.a('object')
        const properties = [
            { key: 'publicKey', byteLength: 32 },
            { key: 'secretKey', byteLength: 32 },
        ]
        for (const property of properties) {
            expect(providerKeypair).to.have.property(property.key)
            expect(providerKeypair[property.key]).to.be.a('Uint8Array')
            expect(providerKeypair[property.key]).to.have.length(property.byteLength, `${property.key} has wrong byte length`)
            expect(providerKeypair[property.key]).to.not.equal(seekerKeypair[property.key])
        }
    })
});