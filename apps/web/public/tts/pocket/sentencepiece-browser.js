/* eslint-disable */
// Browser shims for Node.js modules used by sentencepiece.js
// These shims allow the sentencepiece module to load in the browser.
// The actual fs operations are not used when loading from base64.

// Shim for 'fs' module
export function readFileSync(path) {
    throw new Error(`fs.readFileSync not available in browser. Tried to read: ${path}`);
}

export function existsSync(path) {
    return false;
}

export const promises = {
    readFile: (path) => Promise.reject(new Error(`fs.promises.readFile not available in browser`))
};

// Default export for `import * as fs from 'fs'`
export default {
    readFileSync,
    existsSync,
    promises
};

// Buffer shim - re-export what sentencepiece needs
// `import { Buffer as Buffer$1 } from 'buffer'`
export const Buffer = globalThis.Buffer || {
    from: (data, encoding) => {
        if (encoding === 'base64') {
            const binary = atob(data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }
        if (typeof data === 'string') {
            return new TextEncoder().encode(data);
        }
        return new Uint8Array(data);
    },
    isBuffer: (obj) => obj instanceof Uint8Array,
    alloc: (size) => new Uint8Array(size),
    allocUnsafe: (size) => new Uint8Array(size),
    concat: (buffers, totalLength) => {
        if (totalLength === undefined) {
            totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
        }
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of buffers) {
            result.set(buf, offset);
            offset += buf.length;
        }
        return result;
    }
};

// Named export for Buffer$1
export { Buffer as Buffer$1 };
