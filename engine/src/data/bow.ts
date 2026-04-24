const bow = {
  Info: {
    "name": "Bow",
    "description": "A wooden bow that can shoot arrows."
  },
  Transform: { "y": 1 },
  Body: {
    "type": "composite",
    "params": {
      "parts": [
        // Main bow body (curved)
        {
          "geometry": { "type": "box", "params": { "lengthX": 0.1, "lengthY": 1.2, "lengthZ": 0.05 } },
          "material": { "type": "solid", "params": { "color": "#8B4513" } }, // Brown wood
          "localPosition": [0, 0, 0],
        },
        // Bow string (visual)
        {
          "geometry": { "type": "box", "params": { "lengthX": 0.02, "lengthY": 1.0, "lengthZ": 0.02 } },
          "material": { "type": "solid", "params": { "color": "#DCDCDC" } }, // Light gray string
          "localPosition": [0.15, 0, 0],
        },
        // Grip
        {
          "geometry": { "type": "box", "params": { "lengthX": 0.12, "lengthY": 0.2, "lengthZ": 0.08 } },
          "material": { "type": "solid", "params": { "color": "#654321" } }, // Darker brown
          "localPosition": [0, 0, 0],
        }
      ]
    }
  },
  MotionSource: {
    "type": "dynamicRigidBody",
    "params": {
      "mass": 0.8
    }
  },
  Rules: [
    {
      trigger: { type: "primaryAction" },
      cooldown: 1.0,
      actions: [
        {
          type: "spawnEntityFrom",
          params: {
            entity: "arrow",
            velocity: 40
          },
          target: "self"
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

export default bow;