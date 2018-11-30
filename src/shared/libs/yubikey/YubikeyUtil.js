// convert string to bytes (default charset)
function str2bytes(str) {
    const buf = new Uint8Array(str.length);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        buf[i] = str.charCodeAt(i) & 0xff;
    }
    return buf;
}

// Convert a hex string to a byte array
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let c = 0; c < bytes.length; c++) {
        bytes[c] = parseInt(hex.substr(c * 2, 2), 16);
    }
    return bytes;
}

// Convert a byte array to a hex string
function bytesToHex(bytes) {
    const hex = [];
    for (let i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xf).toString(16));
    }
    return hex.join('');
}

// see Java's System.arraycopy
function arraycopy(src, srcPos, dest, destPos, length) {
    for (let i = 0; i < length; i++) {
        dest[destPos + i] = src[srcPos + i];
    }
}

module.exports = {
    str2bytes: str2bytes,
    hexToBytes: hexToBytes,
    bytesToHex: bytesToHex,
    arraycopy: arraycopy,
};
