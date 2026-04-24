const enemy = {
    Info: {
        name: "Enemy"
    },
    Body: {
        type: "composite",
        params: {
            parts: [
                {
                    geometry: { type: "capsule", params: { radius: 0.5, height: 2 } },
                    material: { type: "solid", params: { color: "#ccccff" } },
                    children: [
                        {
                            geometry: { type: "none", params: {} },
                            localPosition: [0, 0.5, 0],
                            tag: "head",
                            children: [
                                {
                                    geometry: { type: "none" },
                                    localPosition: [0.25, -0.25, -0.25],
                                    tag: "heldItemAnchor"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    },
    Transform: { y: 2 },
    MotionSource: {
        type: "characterController",
        params: {
            speed: 5,
            jumpHeight: 5,
            canFly: false
        }
    },
    Health: { value: 10 },
    AI: {
        isAggressive: true,
        awarenessRange: 32, // Range within which the AI can detect entities
    },
    Faction: {
        id: "enemy_faction",
    },
    Rules: [
        {
            trigger: { type: "collisionEnter" },
            cooldown: 0.5,
            actions: [
                {
                    type: "damage",
                    params: { amount: 2 },
                    target: "other",
                }
            ]
        }
    ],
    // Inventory: {
    //     size: 6,
    //     selectedItemIndex: 0,
    //     items: ["gun", "healthPotion"] // Example items, can be expanded
    // }
};

export default enemy;
