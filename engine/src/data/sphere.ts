/**
 * Sphere Primitive Entity
 * A simple sphere that can be picked up
 */
const sphere = {
  "Info": {
    name: "Sphere",
    description: "A simple sphere entity."
  },
  "Transform": { "y": 1 },

  "Body": {
    "type": "composite",
    "params": {
      "parts": [
        {
          "geometry": { "type": "sphere", "params": { "radius": 0.5 } },
          "material": { "type": "solid", "params": { "color": "#88ccff" } }
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

export default sphere;
