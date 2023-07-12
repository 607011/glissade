function rc4(msg, key) {
    // if you need to encode strings you have to convert them into
    // an Uint8Array with new TextEncoder().encode('your message')
    console.assert(msg instanceof Uint8Array);
    console.assert(key instanceof Uint8Array);

    // setup S-box from key
    let S = [...new Uint8Array(256).keys()];
    let j = 0;
    for (let i = 0; i < 256; ++i) {
        j = (j + S[i] + key[i % key.length]) % 256;
        [S[i], S[j]] = [S[j], S[i]];
    }
    let i = 0;
    j = 0;
    let res = new Uint8Array(msg.length);
    for (let k = 0; k < msg.length; ++k) {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        [S[i], S[j]] = [S[j], S[i]];
        res[k] = msg[k] ^ S[(S[i] + S[j]) % 256];
    }
    return res;
}

const RC4_KEY = new Uint8Array([13, 150, 44, 194, 96, 146, 143, 208]);

const key = RC4_KEY;
const message = new TextEncoder().encode('Der Pinguin heißt Chilly.');

let enc = rc4(message, key);
console.debug('Encoded:', enc);

console.debug('Encoded (Base64):', Buffer.from(enc).toString('base64'));

let dec = rc4(enc, key);
console.debug('Decoded:', dec);

console.debug(`Original message: ${new TextDecoder().decode(dec)}`);