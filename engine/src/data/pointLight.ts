/**
 * Point Light Entity
 * A point light source that can be placed in the scene
 */
const pointLight = {
  "Info": {
    name: "Point Light",
    description: "A point light that illuminates nearby objects."
  },
  "Transform": { "y": 2 },

  "Body": {
    "type": "composite",
    "params": {
      "parts": [
        {
          "light": {
            "type": "point",
            "params": {
              "intensity": 2,
              "range": 15,
              "color": "#ffffff"
            }
          }
        },
        // Small sphere to visualize the light position in editor
        {
          "geometry": { "type": "sphere", "params": { "radius": 0.1 } },
          "material": { "type": "solid", "params": { "color": "#ffff00", "opacity": 0.8 } },
          "ignoreCollisions": true
        }
      ]
    }
  },

  "MotionSource": {
    "type": "static",
    "params": {}
  }
};

export default pointLight;
