package org.iota.mobile.yubikey

import android.app.Activity
import android.app.PendingIntent
import android.content.*
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.nfc.Tag
import android.os.Handler
import android.os.Looper
import android.os.Message
import com.facebook.common.util.Hex
import com.facebook.react.bridge.Promise


import org.iota.mobile.yubikey.transport.Backend
import org.iota.mobile.yubikey.transport.NfcBackend
import org.iota.mobile.yubikey.transport.UsbBackend
import nordpol.android.AndroidCard
import timber.log.Timber
import com.facebook.react.bridge.ReactContext
import org.iota.mobile.yubikey.exc.YubicoException
import java.io.Closeable
import java.security.SecureRandom


class YubikeyAppletOperations(
    val challenge: ByteArray? = null,
    val slot: Int,
    val context: ReactContext
) :
    Handler.Callback, Closeable {

    override fun close() {
       stop()
    }


    companion object {
        private const val ACTION_USB_PERMISSION = "com.iota.trinity.USB_PERMISSION"
        private const val WHAT_CHECK_USB = 1
        private const val WHAT_NFC_CONNECTED = 2
        private const val DELAY_CHECK_USB = 1000L;
    }

    private lateinit var usbManager: UsbManager
    private lateinit var promise: Promise

    private var usbReceiver: BroadcastReceiver? = null
    private val devicesPrompted: MutableSet<UsbDevice> = mutableSetOf()

    private val handlerThread = android.os.HandlerThread("operations")
    private lateinit var handler: Handler

    init {
        usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    }

    override fun handleMessage(msg: Message?): Boolean {
        when (msg?.what) {
            WHAT_CHECK_USB -> checkUsb_h()
            WHAT_NFC_CONNECTED -> nfcConnected_h(msg.obj as Tag)
        }
        return true
    }



    fun start(apromise: Promise) {
        Timber.d("start...")
        promise = apromise
        handlerThread.start()
        handler = Handler(handlerThread.looper, this)

        usbReceiver?.let { context.unregisterReceiver(it) }

        val filter = IntentFilter(ACTION_USB_PERMISSION)
        usbReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                    Timber.d("USB permission granted")
                    if (device != null) {
                        handler.removeMessages(WHAT_CHECK_USB)
                        handler.sendEmptyMessage(WHAT_CHECK_USB)
                    }
                } else {
                    Timber.d("USB permission denied!")
                }
            }
        }
        context.registerReceiver(usbReceiver, filter)
        handler.sendEmptyMessage(WHAT_CHECK_USB)


        Timber.d("...start")
    }

    fun stop() {
        Timber.d("stop...")
        handlerThread.quit()
        usbReceiver?.let { context.unregisterReceiver(it) }
        usbReceiver = null
        Timber.d("...stop")
    }



    fun nfcConnected(tag: Tag) {
        Timber.d("NFC device connected...")
        handler.sendMessage(Message.obtain(handler, WHAT_NFC_CONNECTED, tag))
        Timber.d("...NFC device connected")
    }

    fun nfcConnected_h(tag: Tag) {
        assert(Looper.myLooper() != Looper.getMainLooper())
        Timber.d("NFC device connectedH...")
        try {
            AndroidCard.get(tag).apply {
                useBackend_h(NfcBackend(this))
            }.close()


        } catch (e: Exception) {
            Timber.e(e, "Error using NFC device")
        }
        Timber.d("...NFC device connectedH")
    }


    protected fun checkUsb_h() {
        assert(Looper.myLooper() != Looper.getMainLooper())
        Timber.d("checkUsb... "+this)
        handler.removeMessages(WHAT_CHECK_USB)
        val device = usbManager.deviceList.values.find { UsbBackend.isSupported(it) }
        when {
            device == null -> {
                Timber.d("No supported USB device found")
                handler.sendEmptyMessageDelayed(WHAT_CHECK_USB, DELAY_CHECK_USB)
            }
            usbManager.hasPermission(device) -> {
                Timber.d("USB device present")
                useBackend_h(UsbBackend.connect(usbManager, device))
            }
            device in devicesPrompted -> Timber.d("USB no permission, already requested!")
            else -> {
                Timber.d("USB no permission, requesting")
                devicesPrompted.add(device)
                val mPermissionIntent = PendingIntent.getBroadcast(
                    context, 0, Intent(
                        ACTION_USB_PERMISSION
                    ), 0
                )
                usbManager.requestPermission(device, mPermissionIntent)
            }
        }
        Timber.d("...checkUsb")
    }

    fun useClient_h(client: YubikeyAppletClient) {
        assert(Looper.myLooper() != Looper.getMainLooper())
        if (challenge != null) {

            var rr = client.challengeResponseHmacSha1(challenge, slot == 2);
            Timber.d("XXXX YEAHHHHH CR " + Hex.encodeHex(rr, false))
            context.currentActivity?.runOnUiThread { promise.resolve(Hex.encodeHex(rr,false)) }

        } else {
            Timber.d("PROGRAMMING.......")
            val secret = ByteArray(20)
            //TODO review. Is this safe enough? Needs a seed?
            SecureRandom().nextBytes(secret)
            var rr = client.setHmacSecret(secret,slot == 2);
            Timber.d("XXXX YEAHHHHH PROGRAMMED " + Hex.encodeHex(rr, false))
            context.currentActivity?.runOnUiThread { promise.resolve(Hex.encodeHex(rr,false)) }
        }

    }

    fun useBackend_h(backend: Backend) {
        assert(Looper.myLooper() != Looper.getMainLooper())
        Timber.d("use backend $backend ...")
        try {
            YubikeyAppletClient(backend).use { client ->
                Timber.d("Got backend, using with client...")
                useClient_h(client)
            }
        } catch (e: Exception) {
            Timber.e(e, "Error using YubikeyAppletClient")
            promise.reject(e.message, e)
        }
    }

}