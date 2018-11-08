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
 * Gets the function to check whether the device has NFC hardware support
 * @return {function} function that returns a Promise of Boolean, *true* if device has NFC hardware, *false* otherwise
 */
export const getIsNfcSupportedFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.isNfcSupported;
    } else if (isIOS) {
        //TODO: not yet implemented
        return null;
    }
};

/**
 * Gets the function to check whether the device's NFC hardware is enabled
 * @return {function} function that returns a Promise of Boolean, *true* if Nfc hardware is present and enabled, *false* otherwise
 */
export const getIsNfcEnabledFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.isNfcEnabled;
    } else if (isIOS) {
        //TODO: not yet implemented, but when implemented will probably always return true, as there seems to be no way to en-/disable Nfc support on iOS
        return null;
    }
};

/**
 * Gets the function to show / open the NFC related settings page on the device
 * @return {function} function that returns a Promise of Boolean, *true* if NFC settings have been opened, *false* otherwise
 */
export const getShowNfcSettingsFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.showNfcSettings;
    } else if (isIOS) {
        //TODO: not yet implemented, but when implemented will probably just do nothing, as there seems to be no programmatical way of opening the Nfc related settings on iOS
        return null;
    }
};

export const getStartDiscoverNfcFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.startDiscoverNfc;
    } else if (isIOS) {
        //TODO: not yet implemented
        return null;
    }
};
export const getStopDiscoverNfcFn = () => {
    if (isAndroid) {
        return NativeModules.YubikeyAndroid.stopDiscoverNfc;
    } else if (isIOS) {
        //TODO: not yet implemented
        return null;
    }
};
