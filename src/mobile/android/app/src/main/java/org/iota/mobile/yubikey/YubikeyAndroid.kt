package org.iota.mobile.yubikey

import android.content.*
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.provider.Settings
import com.facebook.common.util.Hex
import com.facebook.react.bridge.*
import org.iota.mobile.yubikey.backend.Backend
import org.iota.mobile.yubikey.backend.YubikeyNativeAndroidBackendFactory
import timber.log.Timber


class YubikeyAndroid(val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    var backend: Backend? = null;

    override fun getName(): String {
        return "YubikeyAndroid"
    }

    @ReactMethod
    fun waitForBackend(readerMode: Boolean, promise: Promise) {
        val callback: (Backend?) -> Unit = { backend ->
            Timber.d("waitForBackend resolved, backend = ${backend}")
            if (backend!=null) {
                this.backend = backend;
                promise.resolve(null)
            }
            else {
                promise.reject("failed to acquire backend or user cancelled")
            }
        }
        YubikeyNativeAndroidBackendFactory.waitFor(reactContext, readerMode, callback)
    }

    @ReactMethod
    fun sendAdpu(hexEncodedData: String, promise: Promise) {
        if (this.backend == null) {
            promise.reject("backend not initialized");
        } else {
            try {
                Timber.d("send adpu 0x${hexEncodedData}")
                val data = Hex.decodeHex(hexEncodedData);
                val rdata = this.backend!!.sendApdu(data);
                val hexEncodedResult = Hex.encodeHex(rdata, false)
                Timber.d("send adpu returned resolved 0x${hexEncodedResult}")
                promise.resolve(hexEncodedResult)

            } catch (ex: IllegalArgumentException) {
                promise.reject("invalid hex encoding");
            } catch (ex: Exception) {
                promise.reject("TODO something went wrong");
            }
        }
    }

    @ReactMethod
    fun cancelWaitForBackend(promise: Promise) {
        YubikeyNativeAndroidBackendFactory.cancelWaitForBackend()
    }

    @ReactMethod
    fun closeBackend(promise: Promise) {
        if (this.backend == null) {
            promise.reject("backend not initialized");
        } else {
            this.backend!!.close()
            this.backend = null;
            promise.resolve(null)
        }
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

}
