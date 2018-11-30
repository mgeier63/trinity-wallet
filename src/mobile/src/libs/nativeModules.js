import { NativeModules } from 'react-native';
import { isAndroid, isIOS } from 'libs/device';

/**
 * Gets single address generation function
 * @return {function | null} Address generation function
 */
export const getAddressGenFn = () => {
    let genFn = null;
    if (isAndroid) {
        genFn = NativeModules.EntangledAndroid.generateAddress;
    } else if (isIOS) {
        genFn = NativeModules.EntangledIOS.generateAddress;
    }
    return genFn;
};

/**
 * Gets multi address generation function
 * @return {function | null} Address generation function
 */
export const getMultiAddressGenFn = () => {
    let genFn = null;
    if (isAndroid) {
        genFn = NativeModules.EntangledAndroid.generateAddresses;
    } else if (isIOS) {
        genFn = NativeModules.EntangledIOS.generateAddresses;
    }
    return genFn;
};

/**
 * Gets Proof of Work function
 * @return {function | null} PoW function
 */
export const getPowFn = () => {
    let powFn = null;
    if (isAndroid) {
        powFn = NativeModules.EntangledAndroid.doPoW;
    } else if (isIOS) {
        powFn = NativeModules.EntangledIOS.doPoW;
    }
    return powFn;
};

/**
 * Gets digest function
 * @return {function} Digest function
 */
export const getDigestFn = () => {
    return isAndroid ? NativeModules.EntangledAndroid.getDigest : NativeModules.EntangledIOS.getDigest;
};

export const getHashFn = () => {
    if (isAndroid) {
        return NativeModules.Argon2Android.hash;
    } else if (isIOS) {
        return NativeModules.Argon2IOS.hash;
    }
};

//------------------ Yubikey support -----------------------

/**
 * @returns {function} hash function that uses hex-encoded input and output, allowing for input data
 * containing 0x00 bytes (i.e. result of hash the plaintext password on the yubikey)
 */
export const getHashBytesFn = () => {
    if (isAndroid) {
        return NativeModules.Argon2Android.hashBytes;
    }
    //TODO: implement for iOS
    throw new Error('not implemented on iOS');
};

/**
 * Gets the function to check whether the device has NFC hardware support
 * @return {function} function that returns a Promise of Boolean, *true* if device has NFC hardware, *false* otherwise
 */
export const getIsNfcSupportedFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.isNfcSupported;
    }
    //TODO: implement for iOS
    throw new Error('not implemented on iOS');
};

/**
 * Gets the function to check whether the device's NFC hardware is enabled
 * @return {function} function that returns a Promise of Boolean, *true* if Nfc hardware is present and enabled, *false* otherwise
 */
export const getIsNfcEnabledFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.isNfcEnabled;
    }
    //TODO: implement for iOS, but when implemented will probably always return true, as there seems to be no way to en-/disable Nfc support on iOS
    throw new Error('not implemented on iOS');
};

/**
 * Gets the function to show / open the NFC related settings page on the device
 * @return {function} function that returns a Promise of Boolean, *true* if NFC settings have been opened, *false* otherwise
 */
export const getShowNfcSettingsFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.showNfcSettings;
    }
    throw new Error('not implemented on iOS');
};

export const getWaitForYubikeyBackendFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.waitForBackend;
    }
    //TODO: implement for iOS
    throw new Error('not implemented on iOS');
};

export const getCancelWaitForYubikeyBackendFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.cancelWaitForBackend;
    }
    //TODO: implement for iOS
    throw new Error('not implemented on iOS');
};

export const getCloseYubikeyBackendFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.closeBackend;
    }
    //TODO: implement for iOS
    throw new Error('not implemented on iOS');
};

export const getSendYubikeyAdpuFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.sendAdpu;
    }
    //TODO: implement for iOS
    throw new Error('not implemented on iOS');
};

export const isYubikeyBackendImplemented = () => {
    if (isAndroid) {
        return true; //XYZZY
    }
    //TODO: implement for iOS
    return false;
};
