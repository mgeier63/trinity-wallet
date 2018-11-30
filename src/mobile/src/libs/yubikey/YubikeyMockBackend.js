import { hexToBytes, bytesToHex } from 'shared-modules/libs/yubikey/YubikeyUtil';

function getOrWaitForBackend() /*Promise<YubikeyNativeBackend>*/ {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
        //resolve(new YubikeyMockBackend());
        setTimeout(() => {
            resolve(new YubikeyMockBackend());
        }, 600);
        //reject(null);
    });
}

function cancelWaitForBackend() {}

class YubikeyMockBackend {
    constructor() {}

    async sendAdpu(adpu) {
        //
        // select applet
        // >>> 00a4040007a0000005272001
        // <<< 030401038307060000009000
        //
        // chal-resp "dummy"
        // >>> 000138000564756d6d79
        // <<< f9924194fd145a3ab05d99e4ff7dbef9a43df6419000
        //
        //         chal-resp "fo823jdmwk482kdkdl" + Salt
        // >>> 000138002007de5c4aac4c16cf86a46bb25d0814ab192320f50189de1753a298b65a4a80b8
        // <<< 97c4760bd862fc8567617f4a57b614748e94e4009000
        // ^^^
        //
        // Program
        //
        // >>> 000103003a00000000000000000000000000000000b0729ac40000c07145bb79ac13c80fcf46062c0374c00000000000001024402600000f15000000000000
        // <<< 0304010483079000
        //
        //
        const hexIn = bytesToHex(adpu);
        //select applet
        if (hexIn.startsWith('00a4040007a0000005272001')) {
            return hexToBytes('030401038307060000009000');
        }
        // chal-resp "dummy"
        if (hexIn.startsWith('00013800')) {
            return hexToBytes('97c4760bd862fc8567617f4a57b614748e94e4009000');
        }
        //program
        if (hexIn.startsWith('000103003a000000000000000000000000')) {
            return hexToBytes('97c4760bd862fc8567617f4a57b614748e94e4009000');
        }
        throw new Error('Foo ' + hexIn);
    }

    close() {
        return Promise.resolve();
    }
}

module.exports = {
    getOrWaitForBackend: getOrWaitForBackend,
    cancelWaitForBackend: cancelWaitForBackend,
    YubikeyNativeBackend: YubikeyMockBackend,
};
