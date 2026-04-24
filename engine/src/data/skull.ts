const skull = {
  Info: {
    "name": "Skull",
    "description": "An old skull. Seems to serve no purpose."
  },
  Transform: { "y": 1 },
  Body: {
    "type": "composite",
    "params": {
      "parts": [
        // Main skull
        {
          "geometry": { "type": "sphere", "params": { "radius": 0.2 } },
          "material": { "type": "solid", "params": { "color": "#F5F5DC" } }, // Bone white
          "localPosition": [0, 0, 0],
        },
        // Eye sockets (left)
        {
          "geometry": { "type": "sphere", "params": { "radius": 0.05 } },
          "material": { "type": "solid", "params": { "color": "#000000" } }, // Black
          "localPosition": [-0.08, 0.05, 0.15],
        },
        // Eye sockets (right)
        {
          "geometry": { "type": "sphere", "params": { "radius": 0.05 } },
          "material": { "type": "solid", "params": { "color": "#000000" } }, // Black
          "localPosition": [0.08, 0.05, 0.15],
        },
        // Nasal cavity
        {
          "geometry": { "type": "box", "params": { "lengthX": 0.03, "lengthY": 0.08, "lengthZ": 0.03 } },
          "material": { "type": "solid", "params": { "color": "#000000" } }, // Black
          "localPosition": [0, -0.02, 0.18],
        }
      ]
    }
  },
  MotionSource: {
    "type": "dynamicRigidBody",
    "params": {
      "mass": 0.5
    }
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

export default skull;