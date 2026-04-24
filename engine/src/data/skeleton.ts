const skeleton = {
    Info: {
        name: "Skeleton"
    },
    Body: {
        type: "composite",
        params: {
            parts: [
                {
                    tag: "spine",
                    geometry: { type: "box", params: { lengthX: 0.6, lengthY: 1.2, lengthZ: 0.3 } },
                    material: { type: "solid", params: { color: "#f0f0f0" } }, // Bone white
                    localPosition: [0, 0, 0],
                    children: [
                        {
                            tag: "head",
                            geometry: { type: "sphere", params: { radius: 0.25, pivot: "bottom" } },
                            material: { type: "solid", params: { color: "#f5f5f5" } },
                            localPosition: [0, 0.6, 0],
                        },
                        {
                            tag: "arm_r",
                            geometry: { type: "box", params: { lengthX: 0.15, lengthY: 0.8, lengthZ: 0.15, pivot: "top" } },
                            material: { type: "solid", params: { color: "#e8e8e8" } },
                            localPosition: [0.45, 0.6, 0],
                            children: [
                                {
                                    tag: "heldItemAnchor",
                                    geometry: { type: "sphere", params: { radius: 0.1, pivot: "top" } },
                                    material: { type: "solid", params: { color: "#dcdcdc" } },
                                    localPosition: [0, -0.8, 0],
                                    localRotation: [-Math.PI / 2, 0], // Rotate to face forward
                                }
                            ]
                        },
                        {
                            tag: "arm_l",
                            geometry: { type: "box", params: { lengthX: 0.15, lengthY: 0.8, lengthZ: 0.15, pivot: "top" } },
                            material: { type: "solid", params: { color: "#e8e8e8" } },
                            localPosition: [-0.45, 0.6, 0],
                            children: [
                                {
                                    tag: "hand_l",
                                    geometry: { type: "sphere", params: { radius: 0.1, pivot: "top" } },
                                    material: { type: "solid", params: { color: "#dcdcdc" } },
                                    localPosition: [0, -0.8, 0]
                                }
                            ]
                        },
                        {
                            tag: "leg_r",
                            geometry: { type: "box", params: { lengthX: 0.15, lengthY: 1.0, lengthZ: 0.15, pivot: "top" } },
                            material: { type: "solid", params: { color: "#e8e8e8" } },
                            localPosition: [0.2, -0.6, 0],
                            children: [
                                {
                                    tag: "foot_r",
                                    geometry: { type: "box", params: { lengthX: 0.2, lengthY: 0.1, lengthZ: 0.3 } },
                                    material: { type: "solid", params: { color: "#dcdcdc" } },
                                    localPosition: [0, -1.05, -0.1]
                                }
                            ]
                        },
                        {
                            tag: "leg_l",
                            geometry: { type: "box", params: { lengthX: 0.15, lengthY: 1.0, lengthZ: 0.15, pivot: "top" } },
                            material: { type: "solid", params: { color: "#e8e8e8" } },
                            localPosition: [-0.2, -0.6, 0],
                            children: [
                                {
                                    tag: "foot_l",
                                    geometry: { type: "box", params: { lengthX: 0.2, lengthY: 0.1, lengthZ: 0.3 } },
                                    material: { type: "solid", params: { color: "#dcdcdc" } },
                                    localPosition: [0, -1.05, -0.1]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    },
    MotionSource: {
        type: "characterController",
        params: {
            speed: 4,
            jumpHeight: 4,
            canFly: false
        }
    },
    Health: { value: 8 },
    AI: {
        isAggressive: true,
        awarenessRange: 30,
    },
    Faction: {
        id: "enemy_faction",
    },
    Rules: [
        {
            trigger: { type: "collisionEnter" },
            cooldown: 0.75,
            actions: [
                {
                    type: "damage",
                    params: { amount: 1 },
                    target: "other",
                }
            ]
        }
    ],
    Inventory: {
        size: 3,
        selectedItemIndex: 0,
        items: ["bow", "skull", "healthPotion"]
    },
    Animation: {
        clips: [
            {
                name: "default",
                duration: 2.0,
                tracks: [
                    {
                        targetTag: "arm_l",
                        keyframes: [
                            { time: 0.0, rotation: [0, 0, 0] },
                            { time: 1.0, rotation: [0, 0, -Math.PI / 16] },
                            { time: 2.0, rotation: [0, 0, 0] },
                        ]
                    },
                    {
                        targetTag: "arm_r",
                        keyframes: [
                            { time: 0.0, rotation: [0, 0, 0] },
                            { time: 1.0, rotation: [0, 0, Math.PI / 16] },
                            { time: 2.0, rotation: [0, 0, 0] },
                        ],
                    },
                ]
            },
            {
                name: "move",
                duration: 1.0,
                tracks: [
                    {
                        targetTag: "arm_l",
                        keyframes: [
                            { time: 0.0, rotation: [0, 0, 0] },
                            { time: 0.25, rotation: [Math.PI / 4, 0, 0] },
                            { time: 0.5, rotation: [0, 0, 0] },
                            { time: 0.75, rotation: [-Math.PI / 4, 0, 0] },
                            { time: 1, rotation: [0, 0, 0] },
                        ]
                    },
                    {
                        targetTag: "arm_r",
                        keyframes: [
                            { time: 0.0, rotation: [0, 0, 0] },
                            { time: 0.25, rotation: [-Math.PI / 4, 0, 0] },
                            { time: 0.5, rotation: [0, 0, 0] },
                            { time: 0.75, rotation: [Math.PI / 4, 0, 0] },
                            { time: 1, rotation: [0, 0, 0] },
                        ],
                    },
                    {
                        targetTag: "leg_l",
                        keyframes: [
                            { time: 0.0, rotation: [0, 0, 0] },
                            { time: 0.25, rotation: [-Math.PI / 4, 0, 0] },
                            { time: 0.5, rotation: [0, 0, 0] },
                            { time: 0.75, rotation: [Math.PI / 4, 0, 0] },
                            { time: 1, rotation: [0, 0, 0] },
                        ],
                    },
                    {
                        targetTag: "leg_r",
                        keyframes: [
                            { time: 0.0, rotation: [0, 0, 0] },
                            { time: 0.25, rotation: [Math.PI / 4, 0, 0] },
                            { time: 0.5, rotation: [0, 0, 0] },
                            { time: 0.75, rotation: [-Math.PI / 4, 0, 0] },
                            { time: 1, rotation: [0, 0, 0] },
                        ],
                    }
                ]
            }
        ]
    }
};

export default skeleton;