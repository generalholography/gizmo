const terrain = {
  "Info": {
    "name": "Terrain",
  },
  "Transform": {},

  "Body": {
    "type": "composite",
    "params": {
      "parts": [
        {
          "geometry": {
            "type": "displacedPlane",
            "params": {
              "lengthX": 100,
              "lengthZ": 100,
              "field": { "type": "simplex", "params": { "seed": 0, "frequency": 0.5, "amplitude": 10, "octaves": 4 } }
            }
          },
          "material": {
            "type": "solid",
            "params": { "color": "#22883a" }
          }
        },
        {
          "geometry": {
            "type": "displacedPlane",
            "params": {
              "lengthX": 100,
              "lengthZ": 100,
              "field": { "type": "simplex", "params": { "amplitude": 0 } }
            }
          },
          "material": {
            "type": "liquid",
            "params": {
              "baseColor": "#3366ff",
              "depthTint": "#112244",
              "opacity": 0.7,
              "waveFreq": 1,
              "waveAmp": 0.5,
              "waveSpeed": 1
            }
          },
          "localPosition": [0, 1, 0],
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

export default terrain;
