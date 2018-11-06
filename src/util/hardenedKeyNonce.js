/**
* Typically the HD protocol uses indexes 
* 0x00 to 0x7fffffff to generate normal keys and indexes
* from 0x80000000 to 0xffffffff to generate hardened keys.
*/
function hardenedKeyNonce(i) {
    return (parseInt('80000000', 16) + i).toString(16)
}

module.exports = hardenedKeyNonce;
