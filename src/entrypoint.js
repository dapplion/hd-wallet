'use strict'
/* eslint-disable */

import HdWallet from './HdWallet'

(function () {
    console.log('Exporting HdWallet', HdWallet, 'to the window', window)
    // Browser globals 
    window.HdWallet = HdWallet
}());