const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encode(str: string): Uint8Array {
    return encoder.encode(str);
}

export function writeEncodedString(target: Uint8Array, str: string): void {
    target.fill(0);
    const encoded = encode(str);
    target.set(encoded.subarray(0, target.length));
}

export function decode(arr: Uint8Array): string {
    const nullIndex = arr.indexOf(0);
    const sliced = nullIndex === -1 ? arr : arr.subarray(0, nullIndex);
    const clean = new TextDecoder().decode(sliced);
    return clean
}
