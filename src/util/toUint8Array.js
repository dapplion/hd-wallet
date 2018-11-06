/**
* Converts data to a Uint8 Array
* @argument {*} data can be a number (4, 23) or a hex string (0xa33f1, 800001)
*/
function toUint8Array(data) {
    if (typeof data === 'number' && data < 256) {
        return new Uint8Array([data])
    }
    if (typeof data === 'string') {
        if (data.startsWith('0x')) data = data.slice(2)
        if (/^[0-9A-F]+$/i.test(data)) {
            return new Buffer.from(data, "hex")
        }
    }
    throw Error(`Unsupported data type, must be decimal or hex: ${data}`)
}

module.exports = toUint8Array;
