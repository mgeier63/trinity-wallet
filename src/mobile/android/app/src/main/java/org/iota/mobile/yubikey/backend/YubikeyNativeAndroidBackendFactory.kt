package org.iota.mobile.yubikey.backend

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.nfc.Tag
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.os.Message
import com.facebook.react.bridge.ReactApplicationContext
import nordpol.android.AndroidCard
import nordpol.android.OnDiscoveredTagListener
import nordpol.android.TagDispatcher
import nordpol.android.TagDispatcherBuilder
import timber.log.Timber

class YubikeyNativeAndroidBackendFactory {

    companion object : Handler.Callback {

        private const val ACTION_USB_PERMISSION = "com.iota.trinity.USB_PERMISSION"
        private const val WHAT_CHECK_USB = 1
        private const val WHAT_NFC_CONNECTED = 2
        private const val DELAY_CHECK_USB = 1000L //USB polling period

        private var handlerThread: HandlerThread? = null;
        private var handler: Handler? = null;


        private lateinit var usbManager: UsbManager
        private var usbReceiver: BroadcastReceiver? = null


        var tagDispatcher: TagDispatcher? = null;

        var waitForCallback: ((Backend?) -> Unit)? = null;

        private var context: ReactApplicationContext? = null;


        fun waitFor(
            racontext: ReactApplicationContext,
            readerMode: Boolean,
            callback: (Backend?) -> Unit
        ) {
            waitForCallback?.let {
                Timber.w("WARNING: waitFor called while while still running, did you forgot to call cancelWaitForBackend ? Cancelling previous request ")
                cancelWaitForBackend();
            }

            handlerThread = HandlerThread("operations")
            handlerThread?.start()
            handler = Handler(
                handlerThread?.looper, this
            )


            waitForCallback = callback;
            context = racontext;


            usbManager = racontext.getSystemService(Context.USB_SERVICE) as UsbManager

            val filter = IntentFilter(ACTION_USB_PERMISSION)
            usbReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        Timber.d("USB permission granted")
                        if (device != null) {
                            handler?.removeMessages(
                                WHAT_CHECK_USB
                            )
                            handler?.sendEmptyMessage(
                                WHAT_CHECK_USB
                            )
                        }
                    } else {
                        Timber.d("USB permission denied!")
                    }
                }
            }
            racontext.registerReceiver(usbReceiver, filter)
            handler?.sendEmptyMessage(
                WHAT_CHECK_USB
            )


            tagDispatcher =
                    TagDispatcherBuilder(racontext.currentActivity, OnDiscoveredTagListener {
                        handler?.sendMessage(
                            Message.obtain(
                                handler,
                                WHAT_NFC_CONNECTED, it
                            )
                        )
                    }).enableReaderMode(readerMode)
                        .enableUnavailableNfcUserPrompt(false)
                        .build()


            when (tagDispatcher!!.enableExclusiveNfc()) {
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

        fun cancelWaitForBackend() {
            waitForCallback?.invoke(null);
            cleanup()
        }

        fun cleanup() {
            usbReceiver?.let {
                context?.unregisterReceiver(it)
            }
            tagDispatcher?.disableExclusiveNfc();
            handlerThread?.quit()
            handlerThread = null;
            context = null;
            waitForCallback = null;
        }


        override fun handleMessage(msg: Message?): Boolean {
            when (msg?.what) {
                WHAT_CHECK_USB -> checkUsb_h()
                WHAT_NFC_CONNECTED -> nfcConnected_h(
                    msg.obj as Tag
                )
            }
            return true
        }

        fun nfcConnected_h(tag: Tag) {
            assert(Looper.myLooper() != Looper.getMainLooper())
            Timber.d("NFC device connectedH...")
            try {
                val card = AndroidCard.get(tag);
                if (card != null) {
                    val backend = NfcBackend(card);
                    waitForCallback?.invoke(backend)
                    cleanup()
                } else {
                    Timber.d("NFC tag received, but it's not an Android / ISO card")
                }

            } catch (e: Exception) {
                Timber.e(e, "Error using NFC device")
            }
            Timber.d("...NFC device connected")
        }

        protected fun checkUsb_h() {
            assert(Looper.myLooper() != Looper.getMainLooper())
            handler?.removeMessages(
                WHAT_CHECK_USB
            )
            val device = usbManager.deviceList.values.find { UsbBackend.isSupported(it) }
            when {
                device == null -> {
                    Timber.d("No supported USB device found")
                    handler?.sendEmptyMessageDelayed(
                        WHAT_CHECK_USB,
                        DELAY_CHECK_USB
                    )
                }
                usbManager.hasPermission(device) -> {
                    Timber.d("USB device present")
                    try {
                        val backend = UsbBackend.connect(usbManager, device)
                        waitForCallback?.invoke(backend)
                        cleanup()
                    } catch (e: Exception) {
                        Timber.w(e);
                    }
                }
                else -> {
                    Timber.d("USB no permission, requesting")
                    val mPermissionIntent = PendingIntent.getBroadcast(
                        context, 0, Intent(
                            ACTION_USB_PERMISSION
                        ), 0
                    )
                    usbManager.requestPermission(device, mPermissionIntent)
                }
            }
        }
    }


}
