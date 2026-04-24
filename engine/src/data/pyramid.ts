/**
 * Pyramid Primitive Entity
 * A simple pyramid that can be picked up
 */
const pyramid = {
  "Info": {
    name: "Pyramid",
    description: "A simple pyramid entity."
  },
  "Transform": { "y": 1 },

  "Body": {
    "type": "composite",
    "params": {
      "parts": [
        {
          "geometry": { "type": "pyramid", "params": { "width": 1, "height": 1, "depth": 1 } },
          "material": { "type": "solid", "params": { "color": "#ffff88" } }
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

export default pyramid;
