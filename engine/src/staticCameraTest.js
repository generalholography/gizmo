export default {
  setupScene(api) {
    const { spawn, THREE, setResource } = api;

    setResource('metadata', {
      title: 'Static Camera Test',
      description: 'Testing StaticCamera component',
      tags: ['testing', 'camera', 'debug'],
      brandColors: ['#ffffff', '#ff6b6b'],
      dimensions: [{
        name: 'base',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: {
          color: '#FFFFFF',
          clouds: {
            coverage: 0.0
          }
        }
      }]
    });

    // Spawn a static camera entity
    spawn({
      Transform: { x: 0, y: 5, z: 20 },
      StaticCamera: { 
        fov: 60, 
        lookAt: { x: 0, y: 0, z: 0 } 
      }
    });

    // Spawn some objects to look at
    spawn({
      Transform: { x: 0, y: 1, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: { type: "box", params: { width: 2, height: 2, depth: 2 } },
            material: { type: "solid", params: { color: "#FF0000" } }
          }]
        }
      },
      MotionSource: { type: "static", params: {} }
    });

    spawn({
      Transform: { x: -5, y: 1, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: { type: "sphere", params: { radius: 1 } },
            material: { type: "solid", params: { color: "#00FF00" } }
          }]
        }
      },
      MotionSource: { type: "static", params: {} }
    });

    spawn({
      Transform: { x: 5, y: 1, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: { type: "sphere", params: { radius: 1 } },
            material: { type: "solid", params: { color: "#0000FF" } }
          }]
        }
      },
      MotionSource: { type: "static", params: {} }
    });

    // Add terrain
    spawn({
      Transform: { y: -1 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: { 
              type: "box", 
              params: { width: 50, height: 0.5, depth: 50 } 
            },
            material: { type: "solid", params: { color: "#808080" } }
          }]
        }
      },
      MotionSource: { type: "static", params: {} }
    });
  }
};
