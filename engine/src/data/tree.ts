const tree = {
  Transform: {},
  Body: {
    type: "composite",
    params: {
      parts: [
        {
          geometry: { type: "cylinder", params: { radius: 0.35, height: 7, pivot: "bottom" } },
          material: { type: "solid", params: { color: "#8B5A2B" } },
          children: [
            {
              geometry: { type: "sphere", params: { radius: 2.25 } },
              material: { type: "solid", params: { color: "#228b22" } },
              localPosition: [0, 7, 0],
            }
          ]
        },
      ]
    }
  },
  MotionSource: {
    type: "static",
    params: {}
  }
};

export default tree;
