const coins = {
  Info: {
    name: "Coins",
    description: "Magical coins that heal nearby entities for 1 HP."
  },
  Body: {
    type: "composite",
    params: {
      parts: [
        {
          geometry: { type: "cylinder", params: { radius: 0.15, height: 0.05 } },
          material: { type: "solid", params: { color: "#FFD700" } },
          localPosition: [0, 0.025, 0]
        },
        {
          geometry: { type: "cylinder", params: { radius: 0.12, height: 0.03 } },
          material: { type: "solid", params: { color: "#FFA500" } },
          localPosition: [0, 0.06, 0]
        },
        {
          geometry: { type: "cylinder", params: { radius: 0.1, height: 0.02 } },
          material: { type: "solid", params: { color: "#FFD700" } },
          localPosition: [0, 0.08, 0]
        }
      ]
    }
  },
  MotionSource: {
    type: "dynamicRigidBody",
    params: {
      mass: 0.1
    }
  },
  Rules: [
    {
      trigger: { type: "entityInRange", params: { range: 2.0 } },
      cooldown: 1.0,
      actions: [
        {
          type: "heal",
          params: { amount: 1 },
          target: "other",
          range: 2.0
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

export default coins;