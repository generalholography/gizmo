const healthPotion = {
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
      trigger: { type: "primaryAction", params: { range: 0 } },
      actions: [
        {
          type: "heal",
          params: { amount: 8 },
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
};

export default healthPotion;