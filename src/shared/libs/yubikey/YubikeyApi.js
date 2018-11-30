import { getProgramHmacCRConfigStructure } from './YubikeyConfigurator';
import { arraycopy } from './YubikeyUtil';

/* eslint-disable no-unused-vars */

const APDU_OK = 0x9000 & 0xffff;
const APDU_DATA_REMAINING_SW1 = 0x61 & 0xff;

const SLOT_CONFIG = 0x01;
const SLOT_CONFIG2 = 0x03;

const SLOT_CHAL_HMAC1 = 0x30;
const SLOT_CHAL_HMAC2 = 0x38;

const PUT_INS = 0x01;
const DELETE_INS = 0x02;
const SET_CODE_INS = 0x03;
const RESET_INS = 0x04;

const LIST_INS = 0xa1;
const CALCULATE_INS = 0xa2;
const VALIDATE_INS = 0xa3;
const CALCULATE_ALL_INS = 0xa4;
const SEND_REMAINING_INS = 0xa5;

const AID = new Uint8Array([0xa0, 0x00, 0x00, 0x05, 0x27, 0x20, 0x01]);
export const YUBIKEY_ERROR_MISCONFIGURED = 'YUBIKEY_ERROR_MISCONFIGURED';

export const YUBIKEY_STATE = {
    INACTIVE: 'inactive',
    WAITING: 'waiting',
    COMMUNICATING: 'comm',
};

export class YubikeyApi {
    constructor(backend, useSlot2) {
        this.backend = backend;
        this.useSlot2 = useSlot2;
        this.appletSelected = false;
    }

    close() {
        this.backend.close();
        this.backend = new class {
            close() {
                throw new Error('closing a closed backend');
            }

            transceive(adpu) {
                return new Promise((resolve, reject) => {
                    reject('transceiving on a closed backend');
                });
            }
        }();
    }

    send(apdu) {
        //console.log('>>> ' + bytesToHex(apdu));
        return this.backend.sendAdpu(apdu).then((rapdu) => {
            //console.log('<<< ' + bytesToHex(rapdu));
            const resp = parseApduResponse(rapdu);
            if (resp.status === APDU_OK) {
                return resp.data;
            }
            throw new Error('received invalid ADPU, status = 0x' + resp.status.toString(16));
        });
    }

    //throws Error if applet not installed or unable to select
    _doSelectYubikeyApplet() {
        if (!this.appletSelected) {
            const adpu = buildAdpu(0xa4, 0x04, 0, AID);
            const r = this.send(adpu);
            this.appletSelected = true;
            return r;
        }
    }

    //throws Error if programming failed
    async doProgramHmacCR(secret) {
        await this._doSelectYubikeyApplet();
        const adpu = buildAdpu(
            PUT_INS,
            this.useSlot2 ? SLOT_CONFIG2 : SLOT_CONFIG,
            0,
            getProgramHmacCRConfigStructure(secret),
        );
        return this.send(adpu);
    }

    //throws Error if challenge response failed
    async doChallengeResponse(challenge) {
        await this._doSelectYubikeyApplet();
        const adpu = buildAdpu(PUT_INS, this.useSlot2 ? SLOT_CHAL_HMAC2 : SLOT_CHAL_HMAC1, 0, challenge);
        const res = await this.send(adpu);
        if (res.length !== 20) {
            throw new Error(YUBIKEY_ERROR_MISCONFIGURED);
        }
        return res;
    }
}

class ApduResponse {
    constructor(data, status) {
        this.data = data;
        this.status = status;
    }
}

function buildAdpu(instruction, param1, param2, data) {
    let pos = 0;
    const apdu = new Uint8Array(256);
    apdu[pos++] = 0;
    apdu[pos++] = instruction;
    apdu[pos++] = param1;
    apdu[pos++] = param2;
    if (data !== null) {
        apdu[pos++] = data.length;
        arraycopy(data, 0, apdu, pos, data.length);
        pos += data.length;
    }
    return apdu.subarray(0, pos);
}

function parseApduResponse(raw) {
    const status = ((raw[raw.length - 2] & 0xff) << 8) | (raw[raw.length - 1] & 0xff);
    return new ApduResponse(raw.subarray(0, -2), status);
}
