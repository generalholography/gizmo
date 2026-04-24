const player = {
  Info: {
    name: "Player"
  },
  Body: {
    type: "composite",
    params: {
      parts: [
        {
          geometry: { type: "capsule", params: { radius: 0.5, height: 2, pivot: "bottom" } },
          children: [
            {
              geometry: { type: "none" },
              localPosition: [0, 1.82, 0],
              tag: "head",
              children: [
                {
                  geometry: { type: "none" },
                  localPosition: [0.25, -0.25, -0.75],
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
  Health: { value: 20 },
  Player: {},
  Rules: [
    {
      trigger: { type: "primaryAction" },
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
  Inventory: {
    size: 6,
  },
  Faction: {
    id: "player_faction",
  }
};

export default player;
