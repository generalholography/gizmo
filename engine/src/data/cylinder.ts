/**
 * Cylinder Primitive Entity
 * A simple cylinder that can be picked up
 */
const cylinder = {
  "Info": {
    name: "Cylinder",
    description: "A simple cylinder entity."
  },
  "Transform": { "y": 1 },

  "Body": {
    "type": "composite",
    "params": {
      "parts": [
        {
          "geometry": { "type": "cylinder", "params": { "radius": 0.5, "height": 1 } },
          "material": { "type": "solid", "params": { "color": "#ffcc88" } }
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

export default cylinder;
