package org.iota.mobile.yubikey.transport

import nordpol.IsoCard
import timber.log.Timber

class NfcBackend(private val card: IsoCard) : Backend {
    override val persistent = false

    init {
        card.connect()
        card.timeout = 3000
    }

    override fun sendApdu(apdu: ByteArray): ByteArray = card.transceive(apdu)

    override fun close() {
        Timber.d("close NFCbackend")
        card.close()
    }
}