export const vert = `
				varying vec3 vLocalPosition;
				void main() {
					vLocalPosition = position; // use local/object space
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`;

export const frag = `
				uniform vec3 topColor;
				uniform vec3 bottomColor;
				uniform float offset;
				uniform float exponent;
				uniform vec3 sunDirection;
				uniform vec3 sunColor;
				uniform float sunIntensity;
				uniform vec3 cloudsColor;
				uniform float cloudsCoverage;
				uniform float starsIntensity;

				varying vec3 vLocalPosition;

				vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
				vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

				float noise3d(vec3 v) {
					const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
					const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

					// First corner
					vec3 i  = floor(v + dot(v, C.yyy) );
					vec3 x0 =   v - i + dot(i, C.xxx) ;

					// Other corners
					vec3 g = step(x0.yzx, x0.xyz);
					vec3 l = 1.0 - g;
					vec3 i1 = min( g.xyz, l.zxy );
					vec3 i2 = max( g.xyz, l.zxy );

					// x0 = x0 - 0.0 + 0.0 * C.xxx;
					// x1 = x0 - i1  + 1.0 * C.xxx;
					// x2 = x0 - i2  + 2.0 * C.xxx;
					// x3 = x0 - 1.0 + 3.0 * C.xxx;
					vec3 x1 = x0 - i1 + C.xxx;
					vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
					vec3 x3 = x0 - D.yyy;      // -1.0 + 3.0 * C.x = -0.5

					// Permutations
					i = mod(i, 289.0 ); 
					vec4 p = permute( permute( permute( 
								i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
							+ i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
							+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

					// Gradients
					float n_ = 1.0/7.0; // N=7
					vec3 ns = n_ * D.wyz - D.xzx;

					vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod(p,N*N)
					vec4 x_ = floor(j * ns.z);
					vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

					vec4 x = x_ *ns.x + ns.yyyy;
					vec4 y = y_ *ns.x + ns.yyyy;
					vec4 h = 1.0 - abs(x) - abs(y);

					vec4 b0 = vec4( x.xy, y.xy );
					vec4 b1 = vec4( x.zw, y.zw );

					vec4 s0 = floor(b0)*2.0 + 1.0;
					vec4 s1 = floor(b1)*2.0 + 1.0;
					vec4 sh = -step(h, vec4(0.0));

					vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
					vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

					vec3 p0 = vec3(a0.xy,h.x);
					vec3 p1 = vec3(a0.zw,h.y);
					vec3 p2 = vec3(a1.xy,h.z);
					vec3 p3 = vec3(a1.zw,h.w);

					// Normalise gradients
					vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
					p0 *= norm.x;
					p1 *= norm.y;
					p2 *= norm.z;
					p3 *= norm.w;

					// Mix contributions from corners
					vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
					m = m * m;
					return 42.0 * dot( m*m, vec4(dot(p0,x0), dot(p1,x1), 
												dot(p2,x2), dot(p3,x3)) );
				}

				float random(vec2 st) {
					return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
				}

				float noise(vec2 st) {
					vec2 i = floor(st);
					vec2 f = fract(st);
					float a = random(i);
					float b = random(i + vec2(1.0, 0.0));
					float c = random(i + vec2(0.0, 1.0));
					float d = random(i + vec2(1.0, 1.0));
					vec2 u = f * f * (3.0 - 2.0 * f);
					return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
				}

				void main() {
					// use local position instead of world position
					vec3 direction = normalize(vLocalPosition);

					// Vertical gradient factor
					float h = clamp(direction.y + offset, 0.0, 1.0);
					vec3 finalColor = mix(bottomColor, topColor, pow(h, exponent));

					// --- Sun ---
					if (sunIntensity > 0.0) {
						float sunDot = dot(direction, normalize(sunDirection));
						float sunDisk = smoothstep(0.999, 1.0, sunDot);
						finalColor += sunDisk * sunColor * sunIntensity;

						float glow = smoothstep(0.999, 1.0, sunDot);
						finalColor += glow * sunColor * sunIntensity * 0.3;
					}

					// --- Clouds ---
					if (cloudsCoverage > 0.0 && direction.y > 0.0) {
						// vec2 cloudCoord = direction.xz * 2.0
						vec2 cloudCoord = direction.xz / max(direction.y, 0.001);
						float cloudNoise = noise(cloudCoord * 3.0) * 0.5
										+ noise(cloudCoord * 6.0) * 0.25
										+ noise(cloudCoord * 12.0) * 0.125;
						float clouds = smoothstep(1.0 - cloudsCoverage, 1.0, cloudNoise);
						// Fade clouds toward horizon (distance) using view elevation
						float cloudFade = smoothstep(0.0, 0.25, direction.y);
						finalColor = mix(finalColor, cloudsColor, clouds * 0.9 * cloudFade);
					}

					// --- Stars (now using 3D simplex noise) ---
					if (starsIntensity > 0.0) {
						// High frequency 3D noise sampled along view direction.
						// noise3d returns roughly in [-1,1]; remap to [0,1].
						float n = noise3d(direction * 100.0);
						n = clamp(n * 0.5 + 0.5, 0.0, 1.0);

						// Threshold to isolate sparse bright points (stars).
						// Adjust 0.995 for density; higher -> fewer stars.
						float starMask = step(0.9, n);

						// Optional micro twinkle via a secondary modulation:
						// starMask *= 0.75 + 0.25 * noise3d(direction * 400.0);

						finalColor += starMask * starsIntensity * vec3(1.0, 1.0, 0.9);
					}

					gl_FragColor = vec4(finalColor, 1.0);
				}
			`