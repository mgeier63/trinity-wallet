package org.iota.mobile.yubikey


import com.reactnativenavigation.parse.params.Bool
import org.iota.mobile.yubikey.exc.ChallengeResponseFailedException
import org.iota.mobile.yubikey.exc.ProgrammingFailedException
import org.iota.mobile.yubikey.transport.Backend
import java.io.Closeable

class YubikeyAppletClient  constructor (backend: Backend) : Closeable {
    private val api: YubikeyAppletApi =
        YubikeyAppletApi(backend)



    @Throws(ChallengeResponseFailedException::class)
    fun challengeResponseHmacSha1(challenge: ByteArray, slot2: Boolean = true): ByteArray{
       return  api.challengeResponseHmacSha1(challenge,slot2)
    }

    @Throws(ProgrammingFailedException::class)
    fun setHmacSecret(secret: ByteArray, slot2: Boolean = true): ByteArray{
        return  api.setHmacSecret(secret,slot2)
    }

    override fun close() = api.close()


    companion object {

    }
}