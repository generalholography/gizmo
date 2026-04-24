const lootCrate = {
  Info: {
    name: "Loot Crate",
    description: "A wooden crate containing valuable items."
  },
  Body: {
    type: "composite",
    params: {
      parts: [
        {
          geometry: { type: "box", params: { lengthX: 1.5, lengthY: 1.5, lengthZ: 1.5 } },
          material: { type: "solid", params: { color: "#8B4513" } }
        },
        // Metal bands
        {
          geometry: { type: "box", params: { lengthX: 1.6, lengthY: 0.1, lengthZ: 1.6 } },
          material: { type: "solid", params: { color: "#555555" } },
          localPosition: [0, 0.3, 0]
        },
        {
          geometry: { type: "box", params: { lengthX: 1.6, lengthY: 0.1, lengthZ: 1.6 } },
          material: { type: "solid", params: { color: "#555555" } },
          localPosition: [0, -0.3, 0]
        }
      ]
    }
  },
  MotionSource: {
    type: "dynamicRigidBody",
    params: {
      mass: 5
    }
  },
  Inventory: {
    size: 3,
    items: [
      {
        Info: {
          name: "Health Potion",
          description: "A magical potion that heals 15 HP when used."
        },
        Body: {
          type: "composite",
          params: {
            parts: [
              {
                geometry: { type: "cylinder", params: { radius: 0.15, height: 0.4 } },
                material: { type: "solid", params: { color: "#ff0000" } },
                localPosition: [0, 0.2, 0]
              },
              {
                geometry: { type: "cylinder", params: { radius: 0.1, height: 0.05 } },
                material: { type: "solid", params: { color: "#8B4513" } },
                localPosition: [0, 0.425, 0]
              }
            ]
          }
        },
        MotionSource: {
          type: "dynamicRigidBody",
          params: {
            mass: 0.2
          }
        },
        Rules: [
          {
            trigger: { type: "primaryAction" },
            actions: [
              {
                type: "heal",
                params: { amount: 15 },
                target: "other",
                onSuccess: [
                  {
                    type: "kill",
                    target: "self"
                  }
                ]
              }
            ]
          },
          {
            trigger: { type: "interact" },
            actions: [
              {
                type: "getPickedUp",
                params: {},
                target: "self"
              }
            ]
          }
        ]
      }
    ]
  },
  Rules: [
    {
      trigger: { type: "interact" },
      actions: [
        {
          type: "getPickedUp",
          params: {},
          target: "self"
        }
      ]
    }
  ]
};

export default lootCrate;