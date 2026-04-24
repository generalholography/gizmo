/**
 * Cone Primitive Entity
 * A simple cone that can be picked up
 */
const cone = {
  "Info": {
    name: "Cone",
    description: "A simple cone entity."
  },
  "Transform": { "y": 1 },

  "Body": {
    "type": "composite",
    "params": {
      "parts": [
        {
          "geometry": { "type": "cone", "params": { "radius": 0.5, "height": 1 } },
          "material": { "type": "solid", "params": { "color": "#cc88ff" } }
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

export default cone;
