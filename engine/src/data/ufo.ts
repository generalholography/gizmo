const ufo = {
  Info: {
    name: "UFO",
    description: "A flying saucer that hovers above the ground."
  },
  Body: {
    type: "composite",
    params: {
      parts: [
        {
          geometry: { type: "cylinder", params: { radius: 2.5, height: 0.5, pivot: "bottom" } },
          material: { type: "solid", params: { color: "#999999" } }
        },
        {
          geometry: { type: "hemisphere", params: { radius: 1.5, pivot: "bottom" } },
          material: { type: "solid", params: { color: "#BBBBFF" } },
          localPosition: [0, 0.5, 0]
        },
        {
          geometry: { type: "cylinder", params: { radius: 1, height: 0.25, pivot: "top" } },
          material: { type: "solid", params: { color: "#FFFFFF" } },
        }
      ]
    }
  },
  Health: { value: 30 },
  MotionSource: {
    type: "characterController",
    params: {
      speed: 3,
      jumpHeight: 0,
      canFly: true
    }
  },
  Rules: [
    {
      trigger: { type: "interact" },
      actions: [
        {
          type: "mount",
          params: { offset: [0, 0.5, 0] },
          target: "self"
        }
      ]
    }
  ]
};

export default ufo;
