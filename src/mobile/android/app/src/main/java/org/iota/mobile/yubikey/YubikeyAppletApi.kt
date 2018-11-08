package org.iota.mobile.yubikey

import com.facebook.common.util.Hex
import org.iota.mobile.yubikey.exc.AppletMissingException
import org.iota.mobile.yubikey.exc.ChallengeResponseFailedException
import org.iota.mobile.yubikey.transport.ApduError
import org.iota.mobile.yubikey.transport.Backend
import timber.log.Timber
import java.io.Closeable
import java.io.IOException
import java.nio.ByteBuffer
import org.iota.mobile.yubikey.base.Configurator
import org.iota.mobile.yubikey.exc.ProgrammingFailedException
import kotlin.experimental.or


class YubikeyAppletApi @Throws(IOException::class)
constructor(private var backend: Backend) : Closeable {


    init {
        try {
            send(0xa4.toByte(), p1 = 0x04) { put(AID) }
        } catch (e: ApduError) {
            throw AppletMissingException()
        }
    }

    @Throws(ChallengeResponseFailedException::class)
    fun challengeResponseHmacSha1(challenge: ByteArray, slot2: Boolean): ByteArray {
        try {
            val resp = send(PUT_INS, p1 = if (slot2) SLOT_CHAL_HMAC2 else SLOT_CHAL_HMAC1) {
                put(challenge)
            }
            val arr = ByteArray(resp.remaining())
            if (arr.size!=20) {
                Timber.w("response size is "+arr.size)
                throw ChallengeResponseFailedException()
            }
            resp.get(arr)
            return arr;
        } catch (e: ApduError) {
            throw ChallengeResponseFailedException()
        }
    }


    @Throws(ProgrammingFailedException::class)
    fun setHmacSecret(secret: ByteArray, slot2: Boolean): ByteArray {
        assert(secret.size==20)
        try {

            val cfg = Configurator()
            cfg.setKey(Configurator.HMAC_SHA1_MODE, secret)
            cfg.setCfgFlags((Configurator.CFGFLAG_CHAL_HMAC or Configurator.CFGFLAG_HMAC_LT64) as Byte)
            cfg.setTktFlags(Configurator.TKTFLAG_CHAL_RESP)
            cfg.setExtFlags((Configurator.EXTFLAG_SERIAL_API_VISIBLE or Configurator.EXTFLAG_ALLOW_UPDATE) as Byte)
            val structure = cfg.getConfigStructure()

            val resp = send(PUT_INS, p1 = if (slot2) SLOT_CONFIG2 else SLOT_CONFIG) {
                put(structure)
            }
            val arr = ByteArray(resp.remaining())
            resp.get(arr)
            return arr;
        } catch (e: ApduError) {
            throw ProgrammingFailedException()
        }
    }



    private fun send(ins: Byte, p1: Byte = 0, p2: Byte = 0, data: ByteBuffer.() -> Unit = {}): ByteBuffer {
        val apdu = ByteBuffer.allocate(256).put(0).put(ins).put(p1).put(p2).put(0).apply(data).let {
            it.put(4, (it.position() - 5).toByte()).array().copyOfRange(0, it.position())
        }

        return ByteBuffer.allocate(4096).apply {
            Timber.d("SEND ADPU= "+(Hex.encodeHex(apdu,false)))
            var rs = backend.sendApdu(apdu)
            Timber.d("RECV ADPU= "+(Hex.encodeHex(rs,false)))
            var resp = splitApduResponse(rs)
            while (resp.status != APDU_OK) {
                if ((resp.status shr 8).toByte() == APDU_DATA_REMAINING_SW1) {
                    put(resp.data)
                    resp = splitApduResponse(
                        backend.sendApdu(
                            byteArrayOf(
                                0,
                                SEND_REMAINING_INS,
                                0,
                                0
                            )
                        )
                    )
                } else {
                    throw ApduError(resp.data, resp.status)
                }
            }
            put(resp.data).limit(position()).rewind()
        }
    }

    override fun close() {
        backend.close()
        backend = object : Backend {
            override val persistent: Boolean = false
            override fun sendApdu(apdu: ByteArray): ByteArray = throw IOException("SENDING APDU ON CLOSED BACKEND!")
            override fun close() = throw IOException("Backend already closed!")
        }
    }



    companion object {

        private const val APDU_OK = 0x9000
        private const val APDU_DATA_REMAINING_SW1 = 0x61.toByte()

        private const val SLOT_CONFIG: Byte = 0x01
        private const val SLOT_CONFIG2: Byte = 0x03

        private const val SLOT_CHAL_HMAC1: Byte = 0x30
        private const val SLOT_CHAL_HMAC2: Byte = 0x38


        private const val PUT_INS: Byte = 0x01
        private const val DELETE_INS: Byte = 0x02
        private const val SET_CODE_INS: Byte = 0x03
        private const val RESET_INS: Byte = 0x04

        private const val LIST_INS = 0xa1.toByte()
        private const val CALCULATE_INS = 0xa2.toByte()
        private const val VALIDATE_INS = 0xa3.toByte()
        private const val CALCULATE_ALL_INS = 0xa4.toByte()
        private const val SEND_REMAINING_INS = 0xa5.toByte()

        private val AID = byteArrayOf(0xa0.toByte(), 0x00, 0x00, 0x05, 0x27, 0x20, 0x01)



        @Throws(IOException::class)
        private fun ByteBuffer.parseTlv(tag: Byte): ByteArray {
            val readTag = get()
            if (readTag != tag) {
                throw IOException("Required tag: %02x, got %02x".format(tag, readTag))
            }
            return ByteArray(0xff and get().toInt()).apply { get(this) }
        }

        private fun ByteBuffer.tlv(tag: Byte, data: ByteArray = byteArrayOf()): ByteBuffer {
            return put(tag).put(data.size.toByte()).put(data)
        }

        private fun ByteBuffer.lv(data: ByteArray = byteArrayOf()): ByteBuffer {
            return put(data.size.toByte()).put(data)
        }

        private data class Response(val data: ByteArray, val status: Int)

        private fun splitApduResponse(resp: ByteArray): Response {
            return Response(
                resp.copyOfRange(0, resp.size - 2),
                ((0xff and resp[resp.size - 2].toInt()) shl 8) or (0xff and resp[resp.size - 1].toInt())
            )
        }
    }
}
