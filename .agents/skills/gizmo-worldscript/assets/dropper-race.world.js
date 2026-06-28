export default {
  setupScene(api) {
    const { initialize, spawn } = api;

    function boxPart(lengthX, lengthY, lengthZ, color) {
  return {
    geometry: { type: 'box', params: { lengthX, lengthY, lengthZ } },
    material: { type: 'solid', params: { color, roughness: 0.8 } }
  };
}

function boxEntity(name, x, y, z, lengthX, lengthY, lengthZ, color = '#7b8794') {
  return {
    Info: { name },
    Transform: { x, y, z },
    Body: { type: 'composite', params: { parts: [boxPart(lengthX, lengthY, lengthZ, color)] } },
    MotionSource: { type: 'static', params: {} }
  };
}

    initialize({
      title: 'Gate Sprint',
      description: 'A ground-plane traversal challenge with readable obstacles and a bright finish goal.',
      tags: ['game', 'race', 'traversal'],
      dimensions: [{ name: 'Course', gravity: -9.81, useDayNightCycle: false, sky: { color: '#92c8ff', sun: { color: '#ffffff', intensity: 0.95, timeOfDay: 1100 }, clouds: { color: '#f7fbff', coverage: 0.2 }, stars: { intensity: 0 } } }],
      achievements: []
    });

    spawn(boxEntity('Start Pad', -18, 0.1, 0, 4, 0.2, 8, '#536176'));
    spawn(boxEntity('North Course Rail', 0, 0.6, -7, 42, 1.2, 0.6, '#cfd7e5'));
    spawn(boxEntity('South Course Rail', 0, 0.6, 7, 42, 1.2, 0.6, '#cfd7e5'));

    for (let gate = 0; gate < 8; gate += 1) {
      const x = -12 + gate * 3.4;
      const offset = gate % 2 === 0 ? -2.2 : 2.2;
      spawn(boxEntity(`Slalom Blocker ${gate + 1}`, x, 0.6, offset, 1.1, 1.2, 4.2, gate % 3 === 0 ? '#f05d5e' : '#f6c85f'));
      spawn(boxEntity(`Checkpoint Marker ${gate + 1}`, x + 1.4, 0.5, -offset, 0.9, 1, 0.9, '#5da9e9'));
    }

    spawn({
      Info: { name: 'Finish Trigger', description: 'Touch the target to complete the sprint.' },
      Transform: { x: 18, y: 1, z: 0 },
      Body: { type: 'composite', params: { parts: [boxPart(0.6, 2, 6, '#ffe066')] } },
      MotionSource: { type: 'static', params: {} },
      Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 1, actions: [
        { type: 'popup', target: 'other', params: { text: 'Finish crossed. Sprint complete.' } },
        { type: 'incrementMetric', target: 'other', params: { metric: 'score', delta: 50 } }
      ] }]
    });

    spawn('player', { Transform: { x: -18, y: 1.2, z: 0 }, Inventory: { size: 4, items: [], selectedItemIndex: 0 }, Metrics: { score: 0 } });
  }
};
