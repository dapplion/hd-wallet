const bip39 = require('./bip39')

const privateKey = "348ce564d427a3311b6536bbcff9390d69395b06ed6c486954e971d960fe8709"
const privateKeyBuffer = Buffer.from(privateKey, 'hex').slice(0,16)
console.log(privateKeyBuffer)

const mnemonic = bip39.entropyToMnemonic(privateKeyBuffer)
console.log(mnemonic)