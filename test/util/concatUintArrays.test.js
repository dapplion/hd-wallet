const expect = require('chai').expect;
const concatUintArrays = require('../../hdWallet/util/concatUintArrays')

describe('concatUintArrays', () => {
    it('should concatenate two Uint Arrays', () => {
        const a1 = new Uint8Array([1, 2])
        const a2 = new Uint8Array([3, 4])
        const a3 = new Uint8Array([1, 2, 3, 4])
        const a1a2 = concatUintArrays(a1, a2)
        expect(a1a2.toString('hex')).to.equal(a3.toString('hex'));
    });
});