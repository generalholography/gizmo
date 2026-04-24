const cube = {
  "Info": {
    name: "Cube",
    description: "A simple cube entity."
  },
  "Transform": { "y": 1 },

  "Body": {
    "type": "composite",
    "params": {
      "parts": [
        {
          "geometry": { "type": "box", "params": { "lengthX": 1, "lengthY": 1, "lengthZ": 1 } },
          "material": { "type": "solid", "params": { "color": "#dddddd" } }
        }
      ]
    }
  },

  "MotionSource": {
    "type": "dynamicRigidBody",
    "params": {
      "mass": 1
    }
  },
  "Health": { value: 10 },
  "Rules": [
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

export default cube;
