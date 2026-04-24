// Tileable 3D Perlin noise implementation with explicit repeat periods.
// This guarantees seamless wrapping along X, Y, and Z with period = `frequency` cycles.

/** Seeded PRNG (Mulberry32) */
function mulberry32(seed: number) {
    let t = Math.floor(seed) >>> 0;
    return function () {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

const grad3: ReadonlyArray<[number, number, number]> = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

function fade(t: number) {
    // 6t^5 - 15t^4 + 10t^3
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
}

function dot(g: [number, number, number], x: number, y: number, z: number) {
    return g[0] * x + g[1] * y + g[2] * z;
}

/**
 * Generates a seamless, tileable 3D noise volume (improved Perlin) with exact wrap.
 * - Perfectly tiles along X, Y, Z with `frequency` cycles across each axis.
 * - Output is Uint8Array of size^3, values in [0,255].
 */
export function generateSeamless3DNoise(
    size: number,
    frequency: number,
    seed: number = Math.random() * 9999
): Uint8Array {
    const data = new Uint8Array(size * size * size);

    // Clamp and setup repeat periods: the noise will repeat every integer lattice step of these values.
    const repeatX = Math.max(1, Math.floor(frequency));
    const repeatY = Math.max(1, Math.floor(frequency));
    const repeatZ = Math.max(1, Math.floor(frequency));

    // Build permutation table from seed
    const rand = mulberry32(seed);
    const p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    // Fisher-Yates shuffle with seed
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
    }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

    function gradAt(ix: number, iy: number, iz: number) {
        // Use permutation to pick a gradient index
        const idx = p[ix & 255] + iy;
        const idx2 = p[idx & 255] + iz;
        const gi = p[idx2 & 255] % grad3.length;
        return grad3[gi];
    }

    function perlin3(u: number, v: number, w: number) {
        // Lattice coordinates with repeat wrapping
        let xi = Math.floor(u) % repeatX; if (xi < 0) xi += repeatX;
        let yi = Math.floor(v) % repeatY; if (yi < 0) yi += repeatY;
        let zi = Math.floor(w) % repeatZ; if (zi < 0) zi += repeatZ;

        const xf = u - Math.floor(u);
        const yf = v - Math.floor(v);
        const zf = w - Math.floor(w);

        const u1 = fade(xf);
        const v1 = fade(yf);
        const w1 = fade(zf);

        const xi1 = (xi + 1) % repeatX;
        const yi1 = (yi + 1) % repeatY;
        const zi1 = (zi + 1) % repeatZ;

        // 8 corners gradients
        const g000 = gradAt(xi,  yi,  zi);
        const g100 = gradAt(xi1, yi,  zi);
        const g010 = gradAt(xi,  yi1, zi);
        const g110 = gradAt(xi1, yi1, zi);
        const g001 = gradAt(xi,  yi,  zi1);
        const g101 = gradAt(xi1, yi,  zi1);
        const g011 = gradAt(xi,  yi1, zi1);
        const g111 = gradAt(xi1, yi1, zi1);

        const x0 = xf, x1 = xf - 1;
        const y0 = yf, y1 = yf - 1;
        const z0 = zf, z1 = zf - 1;

        const n000 = dot(g000, x0, y0, z0);
        const n100 = dot(g100, x1, y0, z0);
        const n010 = dot(g010, x0, y1, z0);
        const n110 = dot(g110, x1, y1, z0);
        const n001 = dot(g001, x0, y0, z1);
        const n101 = dot(g101, x1, y0, z1);
        const n011 = dot(g011, x0, y1, z1);
        const n111 = dot(g111, x1, y1, z1);

        const nx00 = lerp(n000, n100, u1);
        const nx10 = lerp(n010, n110, u1);
        const nx01 = lerp(n001, n101, u1);
        const nx11 = lerp(n011, n111, u1);

        const nxy0 = lerp(nx00, nx10, v1);
        const nxy1 = lerp(nx01, nx11, v1);

        const nxyz = lerp(nxy0, nxy1, w1);
        return nxyz; // in approximately [-1, 1]
    }

    let i = 0;
    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Map voxel indices to noise coordinates spanning `frequency` cycles
                const u = (x / size) * repeatX;
                const v = (y / size) * repeatY;
                const w = (z / size) * repeatZ;
                const n = perlin3(u, v, w);
                // Normalize to [0,255]
                const v01 = Math.max(0, Math.min(1, n * 0.5 + 0.5));
                data[i++] = Math.floor(v01 * 255);
            }
        }
    }

    return data;
}
