/**
 * Scene Camera Entity
 * A camera entity that can be used for static views or cutscenes
 */
const sceneCamera = {
  "Info": {
    name: "Camera",
    description: "A scene camera for static views or cutscenes."
  },
  "Transform": { 
    "y": 2,
    "x": 0,
    "z": 5
  },

  "Body": {
    "type": "composite",
    "params": {
      "parts": [
        // Camera icon shape (small box with cone)
        {
          "geometry": { "type": "box", "params": { "lengthX": 0.4, "lengthY": 0.3, "lengthZ": 0.3 } },
          "material": { "type": "solid", "params": { "color": "#333333" } },
          "ignoreCollisions": true,
          "children": [
            {
              "geometry": { "type": "cone", "params": { "radius": 0.15, "height": 0.3 } },
              "material": { "type": "solid", "params": { "color": "#666666" } },
              "localPosition": { "x": 0, "y": 0, "z": -0.3 },
              "localRotation": { "x": 1.5708, "y": 0, "z": 0 },
              "ignoreCollisions": true
            }
          ]
        }
      ]
    }
  },

  "MotionSource": {
    "type": "static",
    "params": {}
  },

  "StaticCamera": {
    "fov": 75,
    "lookAt": { "x": 0, "y": 0, "z": 0 }
  }
};

export default sceneCamera;
