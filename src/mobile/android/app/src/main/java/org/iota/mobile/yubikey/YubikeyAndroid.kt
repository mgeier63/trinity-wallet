package org.iota.mobile.yubikey

import android.content.*
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.provider.Settings
import com.facebook.common.util.Hex
import com.facebook.react.bridge.*


import nordpol.android.OnDiscoveredTagListener
import nordpol.android.TagDispatcher
import nordpol.android.TagDispatcherBuilder
import timber.log.Timber
import java.io.Closeable


class YubikeyAndroid(val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {


    override fun getName(): String {
        return "YubikeyAndroid"
    }


    @ReactMethod
    fun isNfcSupported(promise: Promise) {
        val result = reactContext.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC)
        promise.resolve(result)
    }

    @ReactMethod
    fun isNfcEnabled(promise: Promise) {
        val nfcAdapter = NfcAdapter.getDefaultAdapter(reactContext)
        if (nfcAdapter != null) {
            promise.resolve(nfcAdapter.isEnabled)
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun showNfcSettings(promise: Promise) {
        if (!reactContext.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC)) {
            promise.resolve(false)
        } else {
            reactContext.startActivity(Intent(Settings.ACTION_NFC_SETTINGS))
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun challengeHmac(challengeHex: String, slot: Int, promise: Promise) {
        challengeOrStore(challengeHex, slot, promise)
    }

    @ReactMethod
    fun programHmacMode(slot: Int, promise: Promise) {
        challengeOrStore(null, slot, promise)
    }

    private fun challengeOrStore(challengeHex: String?, slot: Int, promise: Promise) {
        Timber.d("challengeHmac...");

        val operationHandler = YubikeyAppletOperations( challengeHex?.let { Hex.decodeHex(it)}, 2, reactContext)

        var tagDispatcher : TagDispatcher? = null;
        val wrappedCloseable = object : Closeable {
            override fun close() {
                tagDispatcher?.disableExclusiveNfc()
                operationHandler.close()
            }
        }

        operationHandler.start(CloseableWrappingPromise(wrappedCloseable, promise))

        tagDispatcher = TagDispatcherBuilder(currentActivity, OnDiscoveredTagListener {
            try {
                operationHandler.nfcConnected(it)
            } catch (e: Exception) {
                Timber.e(e, "Error using NFC device")
            }
        }).enableReaderMode(
            true //XYZZY TODO prefs.getBoolean("useNfcReaderMode", false))
        )
            .enableUnavailableNfcUserPrompt(false)
            .build()


        when (tagDispatcher.enableExclusiveNfc()) {
            TagDispatcher.NfcStatus.AVAILABLE_DISABLED -> {
                //NOT rejeting, we might still access the Yubikey via USB
                //promise.reject("NfcStatus.AVAILABLE_DISABLED","NFC is disabled")
                Timber.w("NFC is disabled")
            }
            TagDispatcher.NfcStatus.NOT_AVAILABLE -> {
                // //NOT rejeting, we might still access the Yubikey via USB
                //promise.reject("NfcStatus.NOT_AVAILABLE","NFC is not available on this device")
                Timber.w("NFC is not available")
            }

        }

    }

}
