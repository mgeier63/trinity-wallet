import {
    isYubikeyBackendImplemented,
    getWaitForYubikeyBackendFn,
    getCancelWaitForYubikeyBackendFn,
    getCloseYubikeyBackendFn,
    getSendYubikeyAdpuFn,
} from 'libs/nativeModules';
import { hexToBytes, bytesToHex } from 'shared-modules/libs/yubikey/YubikeyUtil';

let nativeInitBackend;
let nativeSendAdpu;
let nativeCloseBackend;
let nativeCancelWaitForBackend;
const yubikeyImplemented = isYubikeyBackendImplemented();

if (yubikeyImplemented) {
    nativeInitBackend = getWaitForYubikeyBackendFn();
    nativeSendAdpu = getSendYubikeyAdpuFn();
    nativeCloseBackend = getCloseYubikeyBackendFn();
    nativeCancelWaitForBackend = getCancelWaitForYubikeyBackendFn();
}

function getOrWaitForBackend(androidReaderModeEnabled) /*Promise<YubikeyNativeBackend>*/ {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
        if (!yubikeyImplemented) {
            reject();
        }
        nativeInitBackend(androidReaderModeEnabled)
            .then(() => resolve(new YubikeyNativeBackend()))
            .catch(() => reject());
    });
}

function cancelWaitForBackend() {
    nativeCancelWaitForBackend();
}

class YubikeyNativeBackend {
    constructor() {}

    async sendAdpu(adpu) {
        //console.log('YubikeyNativeBackend.sendAdpu >>> ' + bytesToHex(adpu));
        return nativeSendAdpu(bytesToHex(adpu)).then((res) => {
            //console.log('YubikeyNativeBackend.sendAdpu <<< ' + res);
            return hexToBytes(res);
        });
    }

    close() {
        return nativeCloseBackend();
    }
}

module.exports = {
    getOrWaitForBackend,
    cancelWaitForBackend,
    YubikeyNativeBackend,
};
