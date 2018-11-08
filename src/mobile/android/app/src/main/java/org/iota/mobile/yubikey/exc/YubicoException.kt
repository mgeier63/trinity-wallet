
package org.iota.mobile.yubikey.exc

import java.lang.Exception


open class YubicoException  constructor(code: String = CODE_UNKNOWN) : Exception(code) {


    companion object {
        var CODE_UNKNOWN = "CODE_UNKNOWN"
        var CODE_APPLET_MISSING = "CODE_APPLET_MISSING"
        var CODE_CHAL_NOT_CONFIGURED = "CODE_CHAL_NOT_CONFIGURED"
        var CODE_PROGRAMMING_FAILED = "CODE_PROGRAMMING_FAILED"
    }
}