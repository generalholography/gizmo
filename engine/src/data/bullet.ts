const bullet = {
  Info: {
    name: "Bullet"
  },
  Body: {
    type: "composite",
    params: {
      parts: [
        {
          geometry: { type: "sphere", params: { radius: 0.05 } },
          material: { type: "solid", params: { color: "#000000" } },
          ignoreCollisions: true, // Ignore collisions with the player
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
      trigger: { type: "entityInRange", params: { range: 0.15 } },
      actions: [
        {
          type: "damage",
          params: { amount: 2 },
          target: "other",
          range: 0.15,
        },
        {
          type: "kill",
          target: "self"
        }
      ]
    }
  ]
};

export default bullet;
