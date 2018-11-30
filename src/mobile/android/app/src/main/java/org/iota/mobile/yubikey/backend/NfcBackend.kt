package org.iota.mobile.yubikey.backend

import nordpol.IsoCard
import timber.log.Timber

class NfcBackend(private val card: IsoCard) : Backend {

    init {
        card.connect()
        card.timeout = 3000
    }

    override fun sendApdu(apdu: ByteArray): ByteArray = card.transceive(apdu)

    override fun close() {
        Timber.d("close NFC backend")
        card.close()
    }
}