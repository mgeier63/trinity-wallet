// Ported from original Java code found here:
// https://github.com/Yubico/yubico-j/blob/master/src/com/yubico/base/Configurator.java
// https://github.com/Yubico/yubico-j/blob/master/src/com/yubico/base/CRC13239.java

import { arraycopy } from './YubikeyUtil';

/* eslint-disable no-unused-vars */
const UID_SIZE = 6; // Size of secret ID field
const FIXED_SIZE = 16; // Max size of fixed field
const KEY_SIZE = 16; // Size of AES key
const KEY_SIZE_OATH = 20; // Size of OATH-HOTP key (key field + first 4 of UID field)
const ACC_CODE_SIZE = 6; // Size of access code to re-program device

const CFG_FIXED_OFFS = 0;
const CFG_UID_OFFS = FIXED_SIZE;
const CFG_KEY_OFFS = CFG_UID_OFFS + UID_SIZE;
const CFG_ACC_CODE_OFFS = CFG_KEY_OFFS + KEY_SIZE;
const CFG_FIXED_SIZE_OFFS = CFG_ACC_CODE_OFFS + ACC_CODE_SIZE;
const CFG_EXT_FLAGS_OFFS = CFG_FIXED_SIZE_OFFS + 1;
const CFG_TKT_FLAGS_OFFS = CFG_EXT_FLAGS_OFFS + 1;
const CFG_CFG_FLAGS_OFFS = CFG_TKT_FLAGS_OFFS + 1;
const CFG_CRC_OFFS = CFG_CFG_FLAGS_OFFS + 3;
const CFG_SIZE = CFG_CRC_OFFS + 2;

const TKTFLAG_TAB_FIRST = 0x01; // Send TAB before first part
const TKTFLAG_APPEND_TAB1 = 0x02; // Send TAB after first part
const TKTFLAG_APPEND_TAB2 = 0x04; // Send TAB after second part
const TKTFLAG_APPEND_DELAY1 = 0x08; // Add 0.5s delay after first part
const TKTFLAG_APPEND_DELAY2 = 0x10; // Add 0.5s delay after second part
const TKTFLAG_APPEND_CR = 0x20; // Append CR as final character
const TKTFLAG_PROTECT_CFG2 = 0x80; // Block update of config 2 unless config 2 is configured and has this bit set

const CFGFLAG_SEND_REF = 0x01; // Send reference string (0..F) before data
const CFGFLAG_PACING_10MS = 0x04; // Add 10ms intra-key pacing
const CFGFLAG_PACING_20MS = 0x08; // Add 20ms intra-key pacing
const CFGFLAG_STATIC_TICKET = 0x20; // Static ticket generation

const CFGFLAG_TICKET_FIRST = 0x02; // Send ticket first (default is fixed part)
const CFGFLAG_ALLOW_HIDTRIG = 0x10; // Allow trigger through HID/keyboard

const CFGFLAG_SHORT_TICKET = 0x02; // Send truncated ticket (half length)
const CFGFLAG_STRONG_PW1 = 0x10; // Strong password policy flag #1 (mixed case)
const CFGFLAG_STRONG_PW2 = 0x40; // Strong password policy flag #2 (subtitute 0..7 to digits)
const CFGFLAG_MAN_UPDATE = 0x80; // Allow manual (local) update of static OTP

const TKTFLAG_OATH_HOTP = 0x40; // OATH HOTP mode
const CFGFLAG_OATH_HOTP8 = 0x02; // Generate 8 digits HOTP rather than 6 digits
const CFGFLAG_OATH_FIXED_MODHEX1 = 0x10; // First byte in fixed part sent as modhex
const CFGFLAG_OATH_FIXED_MODHEX2 = 0x40; // First two bytes in fixed part sent as modhex
const CFGFLAG_OATH_FIXED_MODHEX = 0x50; // Fixed part sent as modhex
const CFGFLAG_OATH_FIXED_MASK = 0x50; // Mask to get out fixed flags

const TKTFLAG_CHAL_RESP = 0x40; // Challenge-response enabled (both must be set)
const CFGFLAG_CHAL_MASK = 0x22; // Mask to get out challenge type
const CFGFLAG_IS_CHAL_RESP = 0x20; // Flag to indicate if configuration is challenge-response
const CFGFLAG_CHAL_YUBICO = 0x20; // Challenge-response enabled - Yubico OTP mode
const CFGFLAG_CHAL_HMAC = 0x22; // Challenge-response enabled - HMAC-SHA1
const CFGFLAG_HMAC_LT64 = 0x04; // Set when HMAC message is less than 64 bytes
const CFGFLAG_CHAL_BTN_TRIG = 0x08; // Challenge-response operation requires button press

const EXTFLAG_SERIAL_BTN_VISIBLE = 0x01; // Serial number visible at startup (button press)
const EXTFLAG_SERIAL_USB_VISIBLE = 0x02; // Serial number visible in USB iSerial field
const EXTFLAG_SERIAL_API_VISIBLE = 0x04; // Serial number visible via API call

const EXTFLAG_USE_NUMERIC_KEYPAD = 0x08; // Use numeric keypad for digits
const EXTFLAG_FAST_TRIG = 0x10; // Use fast trig if only cfg1 set
const EXTFLAG_ALLOW_UPDATE = 0x20; // Allow update of existing configuration (selected flags + access code)
const EXTFLAG_DORMANT = 0x40; // Dormant configuration (can be woken up and flag removed = requires update flag)

const TKTFLAG_UPDATE_MASK =
    TKTFLAG_TAB_FIRST |
    TKTFLAG_APPEND_TAB1 |
    TKTFLAG_APPEND_TAB2 |
    TKTFLAG_APPEND_DELAY1 |
    TKTFLAG_APPEND_DELAY2 |
    TKTFLAG_APPEND_CR;
const CFGFLAG_UPDATE_MASK = CFGFLAG_PACING_10MS | CFGFLAG_PACING_20MS;
const EXTFLAG_UPDATE_MASK =
    EXTFLAG_SERIAL_BTN_VISIBLE |
    EXTFLAG_SERIAL_USB_VISIBLE |
    EXTFLAG_SERIAL_API_VISIBLE |
    EXTFLAG_USE_NUMERIC_KEYPAD |
    EXTFLAG_FAST_TRIG |
    EXTFLAG_ALLOW_UPDATE |
    EXTFLAG_DORMANT;

const AES_MODE = 0;
const HMAC_SHA1_MODE = 1;

class YubikeyConfigurator {
    // eslint-disable-line no-unused-vars

    constructor() {
        this.fixed = new Uint8Array(16);
        this.uid = new Uint8Array(6);
        this.key = new Uint8Array(16);
        this.accCode = new Uint8Array(6);
        this.curAccCode = new Uint8Array(6);
        this.tktFlags = 0;
        this.extFlags = 0;
        this.cfgFlags = 0;
    }

    setFixed(fixed) {
        this.fixed = new Uint8Array(16);
        for (let i = 0; i < Math.min(fixed.length, this.fixed.length); i++) {
            this.fixed[i] = fixed[i];
        }
    }

    getUid() {
        return this.uid;
    }

    setUid(uid) {
        for (let i = 0; i < UID_SIZE; i++) {
            this.uid[i] = uid[i];
        }
    }

    getKey() {
        return this.key;
    }

    setKey(mode, key) {
        for (let i = 0; i < KEY_SIZE; i++) {
            this.key[i] = key[i];
        }
        if (mode === HMAC_SHA1_MODE) {
            // in the hmac-sha1 modes we store the last 4 bytes of the key in the uid
            for (let i = 0; i < 4; i++) {
                this.uid[i] = key[16 + i];
            }
        }
    }

    getAccCode() {
        return this.accCode;
    }

    setAccCode(accCode) {
        for (let i = 0; i < ACC_CODE_SIZE; i++) {
            this.accCode[i] = accCode[i];
        }
    }

    getCurAccCode() {
        return this.curAccCode;
    }

    setCurAccCode(curAccCode) {
        for (let i = 0; i < ACC_CODE_SIZE; i++) {
            this.curAccCode[i] = curAccCode[i];
        }
    }

    getCfgFlags() {
        return this.cfgFlags;
    }

    setCfgFlags(cfgFlags) {
        this.cfgFlags = cfgFlags;
    }

    getExtFlags() {
        return this.extFlags;
    }

    setExtFlags(extFlags) {
        this.extFlags = extFlags;
    }

    getTktFlags() {
        return this.tktFlags;
    }

    setTktFlags(tktFlags) {
        this.tktFlags = tktFlags;
    }

    getConfigStructure() {
        const cfg = new Uint8Array(CFG_SIZE + ACC_CODE_SIZE);

        arraycopy(this.fixed, 0, cfg, CFG_FIXED_OFFS, this.fixed.length);
        arraycopy(this.uid, 0, cfg, CFG_UID_OFFS, this.uid.length);
        arraycopy(this.key, 0, cfg, CFG_KEY_OFFS, this.key.length);
        arraycopy(this.accCode, 0, cfg, CFG_ACC_CODE_OFFS, this.accCode.length);
        arraycopy(this.curAccCode, 0, cfg, CFG_SIZE, this.curAccCode.length);
        cfg[CFG_FIXED_SIZE_OFFS] = this.fixed.length;
        cfg[CFG_EXT_FLAGS_OFFS] = this.extFlags;
        cfg[CFG_TKT_FLAGS_OFFS] = this.tktFlags;
        cfg[CFG_CFG_FLAGS_OFFS] = this.cfgFlags;

        const crc = ~crc13239(cfg, CFG_SIZE - 2);
        cfg[CFG_CRC_OFFS] = crc;
        cfg[CFG_CRC_OFFS + 1] = crc >> 8;

        return cfg;
    }
}

function crc13239(buf, len) {
    return crc13239X(buf.subarray(0, len));
}

function crc13239X(buf) {
    let crc = 0xffff;

    for (let index = 0; index < buf.length; index++) {
        const value = buf[index];
        crc ^= value & 0xff;
        for (let i = 0; i < 8; i++) {
            const j = crc & 1;
            crc >>= 1;
            if (j) {
                crc ^= 0x8408;
            }
        }
        crc &= 0xffff;
    }
    return crc;
}

export function getProgramHmacCRConfigStructure(secret) {
    if (secret.length !== 20) {
        throw new Error('invalid secret length ' + secret.length());
    }

    const cfg = new YubikeyConfigurator();
    cfg.setKey(HMAC_SHA1_MODE, secret);
    cfg.setCfgFlags(CFGFLAG_CHAL_HMAC | CFGFLAG_HMAC_LT64);
    cfg.setTktFlags(TKTFLAG_CHAL_RESP);
    cfg.setExtFlags(EXTFLAG_SERIAL_API_VISIBLE | EXTFLAG_ALLOW_UPDATE);
    return cfg.getConfigStructure();
}
