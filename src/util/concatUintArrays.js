/**
* Concats two Uint8Arrays
* @argument {Uint8Array} arrayOne
* @argument {Uint8Array} arrayOne
* @return {Uint8Array} mergedArray
*/
function concatUintArrays(arrayOne, arrayTwo) {
    if (!(arrayOne instanceof Uint8Array)) throw Error('arrayOne is not an instance of Uint8Array')
    if (!(arrayTwo instanceof Uint8Array)) throw Error('arrayTwo is not an instance of Uint8Array')
    var mergedArray = new Uint8Array(arrayOne.length + arrayTwo.length);
    mergedArray.set(arrayOne);
    mergedArray.set(arrayTwo, arrayOne.length);
    return mergedArray
}

module.exports = concatUintArrays;
