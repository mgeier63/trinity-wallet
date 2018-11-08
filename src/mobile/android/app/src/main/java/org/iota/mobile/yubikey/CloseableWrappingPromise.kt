package org.iota.mobile.yubikey

import com.facebook.react.bridge.Promise
import java.io.Closeable

class CloseableWrappingPromise(val closeable: Closeable, val promise: Promise) : Promise {
    override fun resolve(value: Any?) {
       closeable.close()
       promise.resolve(value)
    }

    override fun reject(code: String?, message: String?) {
        closeable.close()
        promise.reject(code,message)
    }

    override fun reject(code: String?, e: Throwable?) {
        closeable.close()
        promise.reject(code,e)
    }

    override fun reject(code: String?, message: String?, e: Throwable?) {
        closeable.close()
        promise.reject(code,message,e)
    }

    override fun reject(message: String?) {
        closeable.close()
        promise.reject(message)
    }

    override fun reject(reason: Throwable?) {
        closeable.close()
        promise.reject(reason)
    }

}
