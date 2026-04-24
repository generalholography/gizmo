const arrow = {
  Info: {
    name: "Arrow"
  },
  Body: {
    type: "composite",
    params: {
      parts: [
        // Arrow shaft
        {
          geometry: { type: "cylinder", params: { radius: 0.015, height: 0.6 } },
          material: { type: "solid", params: { color: "#8B4513" } }, // Brown wood
          localPosition: [0, 0, 0],
          localRotation: [-Math.PI / 2, 0, 0], // Rotate to align with the Z-axis
          children: [
            // Arrow head (tip)
            {
              geometry: { type: "cone", params: { radius: 0.03, height: 0.12, pivot: "bottom" } },
              // geometry: { type: "box", params: { lengthX: 0.06, lengthY: 0.12, lengthZ: 0.06, pivot: "bottom" } },
              material: { type: "solid", params: { color: "#C0C0C0" } }, // Silver metal
              localPosition: [0, 0.3, 0],
            },
            // Arrow fletching (feathers)
            {
              geometry: { type: "box", params: { lengthX: 0.08, lengthY: 0.1, lengthZ: 0.02 } },
              material: { type: "solid", params: { color: "#654321" } }, // Dark brown
              localPosition: [0, -0.3, 0],
            }
          ]
        },
      ]
    }
  },
  MotionSource: {
    type: "dynamicRigidBody",
    params: {
      mass: 0.05
    }
  },
  Rules: [
    {
      trigger: { type: "entityInRange", params: { range: 0.33 } },
      actions: [
        {
          type: "damage",
          params: { amount: 3 },
          target: "other",
          range: 0.33,
          onSuccess: [
            {
              type: "kill",
              target: "self"
            }
          ]
        }
      ]
    }
  ]
};

export default arrow;