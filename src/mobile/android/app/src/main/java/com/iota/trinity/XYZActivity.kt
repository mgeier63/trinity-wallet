package com.iota.trinity

import android.os.Bundle
import android.support.design.widget.Snackbar
import android.support.v7.app.AppCompatActivity;
import com.facebook.common.util.Hex
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.reactnativenavigation.utils.NoOpPromise

import kotlinx.android.synthetic.main.activity_xyz.*

import org.iota.mobile.yubikey.YubikeyAndroid
import timber.log.Timber

class XYZActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_xyz)
        setSupportActionBar(toolbar)

        fab.setOnClickListener { view ->
            doit();
        }
    }

    private fun doit() {
      val rax = ReactApplicationContext(this)
        rax.onHostResume(this)
      val yk = YubikeyAndroid(rax)
        val promise = object : NoOpPromise() {
            override fun resolve(value: Any?) {
                Timber.d("Resolved: "+value)
            }
        }

        yk.programHmacMode(2, promise)
       // yk.challengeHmac(Hex.encodeHex("Sample #2".toByteArray(),false),  2, promise)
    }

}
