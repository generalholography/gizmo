const flyAnimationTracks = [
  // WINGS ROOTS
  {
    targetTag: "wing_left_root",
    keyframes: [
      { time: 0.0, rotation: [-0.35, 0.05, 0.80] },
      { time: 0.5, rotation: [-0.15, 0.01, 0.20] },
      { time: 1.0, rotation: [0.0, -0.02, -0.90] },
      { time: 1.5, rotation: [-0.20, 0.02, -0.20] },
      { time: 2.0, rotation: [-0.35, 0.05, 0.80] },
    ],
  },
  {
    targetTag: "wing_right_root",
    keyframes: [
      { time: 0.0, rotation: [-0.35, -0.05, -0.80] },
      { time: 0.5, rotation: [-0.15, -0.01, -0.20] },
      { time: 1.0, rotation: [0.0, 0.02, 0.90] },
      { time: 1.5, rotation: [-0.20, -0.02, 0.20] },
      { time: 2.0, rotation: [-0.35, -0.05, -0.80] },
    ],
  },
  // WING TIPS (pendulum / quarter-cycle lag on Z bend)
  {
    targetTag: "wing_left_tip",
    keyframes: [
      { time: 0.0, rotation: [0.0, 0.0, 0.0] },
      { time: 0.25, rotation: [0.0, 0.0, 0.40] },
      { time: 0.5, rotation: [0.0, 0.0, 0.70] },
      { time: 0.75, rotation: [0.0, 0.0, 0.40] },
      { time: 1.0, rotation: [0.0, 0.0, 0.0] },
      { time: 1.25, rotation: [0.0, 0.0, -0.40] },
      { time: 1.5, rotation: [0.0, 0.0, -0.70] },
      { time: 1.75, rotation: [0.0, 0.0, -0.40] },
      { time: 2.0, rotation: [0.0, 0.0, 0.0] },
    ],
  },
  {
    targetTag: "wing_right_tip",
    keyframes: [
      { time: 0.0, rotation: [0.0, 0.0, 0.0] },
      { time: 0.25, rotation: [0.0, 0.0, -0.40] },
      { time: 0.5, rotation: [0.0, 0.0, -0.70] },
      { time: 0.75, rotation: [0.0, 0.0, -0.40] },
      { time: 1.0, rotation: [0.0, 0.0, 0.0] },
      { time: 1.25, rotation: [0.0, 0.0, 0.40] },
      { time: 1.5, rotation: [0.0, 0.0, 0.70] },
      { time: 1.75, rotation: [0.0, 0.0, 0.40] },
      { time: 2.0, rotation: [0.0, 0.0, 0.0] },
    ],
  },
  // TAIL WAVE
  {
    targetTag: "tail_1",
    keyframes: [
      { time: 0.0, rotation: [0.0, 0.0, 0.0] },
      { time: 0.5, rotation: [0.10, 0.0, 0.0] },
      { time: 1.0, rotation: [0.0, 0.0, 0.0] },
      { time: 1.5, rotation: [-0.10, 0.0, 0.0] },
      { time: 2.0, rotation: [0.0, 0.0, 0.0] },
    ],
  },
  {
    targetTag: "tail_2",
    keyframes: [
      { time: 0.0, rotation: [0.12, 0.0, 0.0] },
      { time: 0.5, rotation: [0.07, 0.0, 0.0] },
      { time: 1.0, rotation: [-0.12, 0.0, 0.0] },
      { time: 1.5, rotation: [-0.07, 0.0, 0.0] },
      { time: 2.0, rotation: [0.12, 0.0, 0.0] },
    ],
  },
  {
    targetTag: "tail_3",
    keyframes: [
      { time: 0.0, rotation: [0.16, 0.0, 0.0] },
      { time: 0.5, rotation: [-0.09, 0.0, 0.0] },
      { time: 1.0, rotation: [-0.16, 0.0, 0.0] },
      { time: 1.5, rotation: [0.09, 0.0, 0.0] },
      { time: 2.0, rotation: [0.16, 0.0, 0.0] },
    ],
  },
  // NECK & HEAD
  {
    targetTag: "neck",
    keyframes: [
      { time: 0.0, rotation: [0.12, 0.0, 0.0] },
      { time: 0.5, rotation: [0.06, 0.0, 0.0] },
      { time: 1.0, rotation: [-0.12, 0.0, 0.0] },
      { time: 1.5, rotation: [0.06, 0.0, 0.0] },
      { time: 2.0, rotation: [0.12, 0.0, 0.0] },
    ],
  },
  {
    targetTag: "_head",
    keyframes: [
      { time: 0.0, rotation: [0.12, 0.0, 0.0] },
      { time: 0.5, rotation: [0.06, 0.0, 0.0] },
      { time: 1.0, rotation: [-0.12, 0.0, 0.0] },
      { time: 1.5, rotation: [0.06, 0.0, 0.0] },
      { time: 2.0, rotation: [0.12, 0.0, 0.0] },
    ],
  },
  // BODY BOB (opposite wing top/bottom)
  {
    targetTag: "dragon_root",
    keyframes: [
      { time: 0.0, position: [0.08, 0.15, 0.0] },
      { time: 0.5, position: [0.0, 0.35, 0.05] },
      { time: 1.0, position: [-0.08, 0.55, 0.0] },
      { time: 1.5, position: [0.0, 0.35, -0.05] },
      { time: 2.0, position: [0.08, 0.15, 0.0] },
    ],
  },
];

const dragon = {
  Info: {
    name: "Ender Dragon",
    description: "A massive obsidian-scaled dragon with blazing violet eyes and sweeping wings.",
  },
  Body: {
    type: "composite",
    params: {
      parts: [
        {
          tag: "dragon_root",
          geometry: { type: "none" },
          ignoreCollisions: true,
          children: [
            {
              tag: "body",
              geometry: { type: "box", params: { lengthX: 2, lengthY: 1.2, lengthZ: 8 } },
              material: { type: "solid", params: { color: "#151515", roughness: 0.9 } },
              localPosition: [0, 0, 0],
              children: [
                ...Array.from({ length: 6 }).map((_, i) => ({
                  tag: `spine_${i}`,
                  geometry: { type: "box", params: { lengthX: 0.4, lengthY: 0.4, lengthZ: 0.5 } },
                  material: { type: "solid", params: { color: "#555555", roughness: 0.6 } },
                  localPosition: [0, 0.8, -2.5 + i * 1.0],
                })),
                {
                  tag: "neck",
                  geometry: { type: "box", params: { lengthX: 0.8, lengthY: 0.8, lengthZ: 3, pivot: "back" } },
                  material: { type: "solid", params: { color: "#151515" } },
                  localPosition: [0, 0.1, -4],
                  children: [
                    {
                      tag: "_head",
                      geometry: { type: "box", params: { lengthX: 1.4, lengthY: 1.4, lengthZ: 1.4, pivot: "front" } },
                      material: { type: "solid", params: { color: "#151515" } },
                      localPosition: [0, 0.2, -3],
                      localRotation: [0, Math.PI, 0],
                      children: [
                        {
                          tag: "jaw",
                          geometry: { type: "box", params: { lengthX: 1.1, lengthY: 0.6, lengthZ: 1.1, pivot: "front" } },
                          material: { type: "solid", params: { color: "#101010" } },
                          localPosition: [0, -0.2, 1.4],
                        },
                        {
                          tag: "eye_left",
                          geometry: { type: "box", params: { lengthX: 0.3, lengthY: 0.2, lengthZ: 0.2 } },
                          material: { type: "solid", params: { color: "#d064ff", metalness: 0.7, roughness: 0.2 } },
                          localPosition: [0.3, 0.2, 1.4],
                        },
                        {
                          tag: "eye_right",
                          geometry: { type: "box", params: { lengthX: 0.3, lengthY: 0.2, lengthZ: 0.2 } },
                          material: { type: "solid", params: { color: "#d064ff", metalness: 0.7, roughness: 0.2 } },
                          localPosition: [-0.3, 0.2, 1.4],
                        },
                      ],
                    },
                  ],
                },
                {
                  tag: "tail_1",
                  geometry: { type: "box", params: { lengthX: 1, lengthY: 0.8, lengthZ: 3, pivot: "front" } },
                  material: { type: "solid", params: { color: "#151515" } },
                  localPosition: [0, -0.1, 4.0],
                  children: [
                    {
                      tag: "tail_2",
                      geometry: { type: "box", params: { lengthX: 0.9, lengthY: 0.7, lengthZ: 3, pivot: "front" } },
                      material: { type: "solid", params: { color: "#151515" } },
                      localPosition: [0, -0.05, 3.0],
                      children: [
                        {
                          tag: "tail_3",
                          geometry: { type: "box", params: { lengthX: 0.8, lengthY: 0.6, lengthZ: 2.5, pivot: "front" } },
                          material: { type: "solid", params: { color: "#151515" } },
                          localPosition: [0, -0.05, 3.0],
                        },
                      ],
                    },
                  ],
                },
                {
                  tag: "wing_left_root",
                  geometry: { type: "box", params: { lengthX: 4, lengthY: 0.3, lengthZ: 1, pivot: "left" } },
                  material: { type: "solid", params: { color: "#252525" } },
                  localPosition: [1.0, 0.1, -1],
                  children: [
                    {
                      tag: "wing_left_membrane_root",
                      geometry: { type: "box", params: { lengthX: 4, lengthY: 0.08, lengthZ: 3.2, pivot: "front" } },
                      material: { type: "solid", params: { color: "#151515", roughness: 0.95 } },
                      localPosition: [2, 0.0, 0.0],
                      localRotation: [0.08, 0.0, 0.0],
                      ignoreCollisions: true,
                    },
                    {
                      tag: "wing_left_tip",
                      geometry: { type: "box", params: { lengthX: 3.5, lengthY: 0.25, lengthZ: 0.8, pivot: "left" } },
                      material: { type: "solid", params: { color: "#202020" } },
                      localPosition: [4.0, 0, 0],
                      children: [
                        {
                          tag: "wing_left_membrane_tip",
                          geometry: { type: "box", params: { lengthX: 3.5, lengthY: 0.06, lengthZ: 3.0, pivot: "front" } },
                          material: { type: "solid", params: { color: "#151515", roughness: 0.95 } },
                          localPosition: [1.75, 0.0, 0.0],
                          localRotation: [0.06, 0.0, 0.0],
                          ignoreCollisions: true,
                        },
                      ],
                    },
                  ],
                },
                {
                  tag: "wing_right_root",
                  geometry: { type: "box", params: { lengthX: 4, lengthY: 0.3, lengthZ: 1, pivot: "right" } },
                  material: { type: "solid", params: { color: "#252525" } },
                  localPosition: [-1.0, 0.1, -1],
                  children: [
                    {
                      tag: "wing_right_membrane_root",
                      geometry: { type: "box", params: { lengthX: 4, lengthY: 0.08, lengthZ: 3.2, pivot: "front" } },
                      material: { type: "solid", params: { color: "#151515", roughness: 0.95 } },
                      localPosition: [-2, 0.0, 0.0],
                      localRotation: [0.08, 0.0, 0.0],
                      ignoreCollisions: true,
                    },
                    {
                      tag: "wing_right_tip",
                      geometry: { type: "box", params: { lengthX: 3.5, lengthY: 0.25, lengthZ: 0.8, pivot: "right" } },
                      material: { type: "solid", params: { color: "#202020" } },
                      localPosition: [-4.0, 0, 0],
                      children: [
                        {
                          tag: "wing_right_membrane_tip",
                          geometry: { type: "box", params: { lengthX: 3.5, lengthY: 0.06, lengthZ: 3.0, pivot: "front" } },
                          material: { type: "solid", params: { color: "#151515", roughness: 0.95 } },
                          localPosition: [-1.75, 0.0, 0.0],
                          localRotation: [0.06, 0.0, 0.0],
                          ignoreCollisions: true,
                        },
                      ],
                    },
                  ],
                },
                { tag: "leg_front_left", geometry: { type: "box", params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 0.6 } }, material: { type: "solid", params: { color: "#151515" } }, localPosition: [0.8, -0.8, -2.5] },
                { tag: "leg_front_right", geometry: { type: "box", params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 0.6 } }, material: { type: "solid", params: { color: "#151515" } }, localPosition: [-0.8, -0.8, -2.5] },
                { tag: "leg_back_left", geometry: { type: "box", params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 0.6 } }, material: { type: "solid", params: { color: "#151515" } }, localPosition: [0.8, -0.8, 1.5] },
                { tag: "leg_back_right", geometry: { type: "box", params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 0.6 } }, material: { type: "solid", params: { color: "#151515" } }, localPosition: [-0.8, -0.8, 1.5] },
              ],
            },
          ],
        },
      ],
    },
  },
  Health: { value: 250, max: 250 },
  // Allow player control when mounted (flying mount)
  MotionSource: {
    type: "characterController",
    params: {
      speed: 7,
      jumpHeight: 0,
      canFly: true,
    },
  },
  AI: { isAggressive: true, awarenessRange: 80 },
  Faction: { id: "player_faction" },
  Rules: [
    {
      trigger: { type: "die" },
      actions: [
        { type: "spawnEntityFrom", params: { entity: "dragon_egg", velocity: 0 }, target: "self" },
      ],
    }
  ],
  Animation: {
    clips: [
      { name: "default", duration: 2, tracks: flyAnimationTracks },
      { name: "move", duration: 2, tracks: flyAnimationTracks },
    ],
  },
};

export default dragon;
