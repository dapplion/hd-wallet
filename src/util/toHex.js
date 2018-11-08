
function toHex(data) {
    if (data instanceof Uint8Array) {
        return (new Buffer.from(data)).toString('hex')
    } else {
        throw Error('Unsupported type, cannot convert to hex')
    }
}

module.exports = toHex