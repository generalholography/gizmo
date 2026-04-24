const gun = {
  Info: {
    "name": "Gun",
    "description": "A gun that can shoot bullets."
  },
  Transform: { "y": 1 },
  Body: {
    "type": "composite",
    "params": {
      "parts": [
        {
          "geometry": { "type": "box", "params": { "lengthX": 0.15, "lengthY": 0.2, "lengthZ": 0.6 } },
          "material": { "type": "solid", "params": { "color": "#777777" } },
          "localPosition": [0, 0.1, 0],
        },
        {
          "geometry": { "type": "box", "params": { "lengthX": 0.1, "lengthY": 0.3, "lengthZ": 0.1 } },
          "material": { "type": "solid", "params": { "color": "#666666" } },
          "localPosition": [0, -0.15, 0.2],
          "localRotation": [-15 * Math.PI / 180, 0, 0]
        }
      ]
    }
  },
  MotionSource: {
    "type": "dynamicRigidBody",
    "params": {
      "mass": 1
    }
  },
  Rules: [
    {
      trigger: { type: "primaryAction" },
      cooldown: 0.25,
      actions: [
        {
          type: "spawnEntityFrom",
          params: {
            entity: "bullet",
            velocity: 50
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

export default gun;
