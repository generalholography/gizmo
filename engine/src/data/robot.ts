import enemy from "./enemy";

export const robot = {
    ...enemy,   //inheritance
    Renderer: {
        parts: [
            {
                mesh: { type: "cylinder", params: { radius: 0.125, height: 1.1 } },
                material: { type: "solid", params: { color: "#ccccff" } },
                offset: [0.2, -0.5, 0]
            },
            {
                mesh: { type: "cylinder", params: { radius: 0.125, height: 1.1 } },
                material: { type: "solid", params: { color: "#ccccff" } },
                offset: [-0.2, -0.5, 0]
            },
            {
                mesh: { type: "sphere", params: { radius: 0.5 } },
                material: { type: "solid", params: { color: "#ccccff" } },
                offset: [0, 0.25, 0]
            },
            {
                mesh: { type: "cylinder", params: { radius: 0.125, height: 1 } },
                material: { type: "solid", params: { color: "#ccccff" } },
                offset: [-0.5, -0.25, 0]
            },
            {
                mesh: { type: "cylinder", params: { radius: 0.125, height: 1 } },
                material: { type: "solid", params: { color: "#ccccff" } },
                offset: [0.5, -0.25, 0]
            },
            {
                mesh: { type: "cylinder", params: { radius: 0.25, height: 0.5 } },
                material: { type: "solid", params: { color: "#ccccff" } },
                offset: [0, 1, 0]
            },
            {
                tag: "head",
                mesh: { type: "box", params: { size: [0.4, 0.15, 0.15] } },
                material: { type: "solid", params: { color: "#ff0000" } },
                offset: [0, 1, -0.25]
            },
        ]
    },
    Transform: { y: 2 },
    PhysicsBody: {
        bodyType: "dynamic",
        mass: 1,
        collider: { type: "capsule", params: { radius: 0.5, height: 1.5 } },
    },
    Health: { value: 20 },
    Rules: [
        {
            trigger: { type: "secondaryAction" },
            cooldown: 0.33,
            actions: [
                {
                    type: "spawnEntityFrom",
                    params: { entity: "bullet", velocity: 10 },
                    target: "self",
                }
            ]
        },
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
    ]
};

export default robot;
