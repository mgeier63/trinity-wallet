const usb = require('usb');
//const util = require('shared-modules/libs/yubikey/YubikeyUtil');

//usb.setDebugLevel(4)

const CMD_ICC_POWER_ON = 0x62;
const CMD_ICC_POWER_OFF = 0x63;
const CMD_XFR_BLOCK = 0x6f;

const COMMAND_STATUS_OK = 0x00;

const USB_CLASS_CSCID = 0x0b;

const USB_HEADER_BASE_SIZE = 10;

//handle of latest registered attach listener function
let onAttach = null;

//handle of reject function of latest call to getOrWait...
let rejectFn = null;

function getOrWaitForBackend() /*Promise<UsbBackend>*/ {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
        onAttach = function(device) {
            if (findInterfaceFromDescriptor(device) !== null) {
                const usbbackend = new YubikeyUsbBackend(device);
                resolve(usbbackend);
            }
        };
        usb.on('attach', onAttach);
        rejectFn = reject;

        const device = usb.getDeviceList().find((d) => {
            return findInterfaceFromDescriptor(d) !== null;
        });

        if (device) {
            const usbbackend = new YubikeyUsbBackend(device);
            resolve(usbbackend);
        }
    }).then(async (usbbackend) => {
        //Note: this block also gets called when device resolved through onAttach listener
        await usbbackend._transceive(CMD_ICC_POWER_ON, new Uint8Array(0));
        usb.removeListener('attach', onAttach);
        onAttach = null;
        rejectFn = null;
        return usbbackend;
    });
}

function cancelWaitForBackend() {
    if (onAttach !== null) {
        usb.removeListener('attach', onAttach);
    }
    onAttach = null;
    if (rejectFn !== null) {
        rejectFn();
    }
    rejectFn = null;
}

const SLOT = 0;

class YubikeyUsbBackend {
    constructor(device) {
        device.open();
        this.device = device;
        this.intf = findInterfaceFromDevice(device);
        this.endPointIn = this.intf.endpoints.find(
            (it) => it.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK && it.direction === 'in',
        );
        this.endPointOut = this.intf.endpoints.find(
            (it) => it.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK && it.direction === 'out',
        );
        this.endPointIn.timeout = 1000;
        this.endPointOut.timeout = 1000;
    }

    sendAdpu(adpu) {
        return this._transceive(CMD_XFR_BLOCK, adpu);
    }

    _transceive(type /*number*/, adpu /*Uint8Array*/) /*Promise<Uint8Array>*/ {
        return this._snd(type, adpu).then(() => {
            return this._rcv(this);
        });
    }

    _snd(type /*number*/, adpu /*Uint8Array*/) /*Promise<Uint8Array>*/ {
        const packet = new ArrayBuffer(USB_HEADER_BASE_SIZE);
        const packetView = new DataView(packet);
        let pos = 0;
        packetView.setUint8(pos++, type);
        packetView.setUint32(pos, adpu.length, true);
        pos += 4;
        packetView.setUint8(pos++, SLOT);
        packetView.setUint8(pos++, this._sequence);
        packetView.setUint8(pos++, 0);
        packetView.setUint16(pos, 0, true);
        pos += 2;
        const data = new Uint8Array(pos + adpu.length);
        data.set(new Uint8Array(packet), 0);
        data.set(adpu, pos);

        return new Promise((resolve, reject) => {
            // console.log('>>> ' + util.bytesToHex(data));
            this.endPointOut.transfer(Buffer.from(data), (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    _rcv() /*Uint8Array*/ {
        return new Promise((resolve, reject) => {
            this.endPointIn.transfer(64, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        }).then((data) => {
            //console.log('<<<: ' + util.bytesToHex(data));
            let pos = 0;
            const ab = new DataView(data.buffer);
            // eslint-disable-next-line no-unused-vars
            const messageType = ab.getUint8(pos++); //MessageType
            const length = ab.getUint32(pos, true);
            pos += 4;
            // eslint-disable-next-line no-unused-vars
            const slot = ab.getUint8(pos++); // slot
            // eslint-disable-next-line no-unused-vars
            const sequence = ab.getUint8(pos++); // sequence
            const status = ab.getUint8(pos++); // status
            const error = ab.getUint8(pos++); // error
            // eslint-disable-next-line no-unused-vars
            const extraParam = ab.getUint8(pos++); // extra parameter
            // eslint-disable-next-line no-unused-vars
            const iccStatus = status & 0x03;
            const commandStatus = (status >> 6) & 0x03;

            if (commandStatus !== COMMAND_STATUS_OK) {
                throw new Error(
                    'USB reply error, command status = 0x' +
                        commandStatus.toString(16) +
                        ' error=0x' +
                        error.toString(16),
                );
            }

            return data.slice(pos, length + pos + 1);
        });
    }

    async close() {
        await this._transceive(CMD_ICC_POWER_OFF, new Uint8Array(0));
        this.intf.release(() => {
            this.device.close();
        });
    }
}

function findInterfaceFromDescriptor(d) {
    if (d.deviceDescriptor.idVendor === 4176) {
        //YubiCo
        for (let i = 0; i < d.configDescriptor.interfaces.length; ++i) {
            const interfaces = d.configDescriptor.interfaces[i];
            for (let k = 0; k < interfaces.length; ++k) {
                const intf = interfaces[k];
                if (intf.bInterfaceClass === USB_CLASS_CSCID) {
                    return intf;
                }
            }
        }
    }
    return null;
}

function findInterfaceFromDevice(d) {
    return d.interfaces.find((it) => it.descriptor.bInterfaceClass === USB_CLASS_CSCID);
}

module.exports = {
    getOrWaitForBackend: getOrWaitForBackend,
    cancelWaitForBackend: cancelWaitForBackend,
    YubikeyUsbBackend: YubikeyUsbBackend,
};
