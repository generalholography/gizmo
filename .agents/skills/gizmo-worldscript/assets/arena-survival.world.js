export default {
  setupScene(api) {
    const { initialize, spawn, registerArchetype } = api;

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
      title: 'Neon Arena Survival',
      description: 'A compact action arena with enemies, pickups, scoring, and a clear central landmark.',
      tags: ['game', 'arena', 'survival'],
      dimensions: [{
        name: 'Arena',
        gravity: -9.81,
        useDayNightCycle: false,
        sky: { color: '#151b2b', sun: { color: '#f7fbff', intensity: 0.85, timeOfDay: 2100 }, clouds: { color: '#27334f', coverage: 0.15 }, stars: { intensity: 0.75 } }
      }],
      achievements: []
    });

    spawn(boxEntity('North Wall', 0, 2, -18, 34, 4, 1, '#6f4fb5'));
    spawn(boxEntity('South Wall', 0, 2, 18, 34, 4, 1, '#6f4fb5'));
    spawn(boxEntity('West Wall', -18, 2, 0, 1, 4, 34, '#4f8fb5'));
    spawn(boxEntity('East Wall', 18, 2, 0, 1, 4, 34, '#4f8fb5'));
    spawn(boxEntity('Score Obelisk', 0, 2.5, 0, 1.4, 5, 1.4, '#ffcf66'));

    registerArchetype('arena_pickup', {
      Info: { name: 'Energy Pickup', description: 'Collect to gain score and healing.' },
      Body: { type: 'composite', params: { parts: [{ geometry: { type: 'sphere', params: { radius: 0.45 } }, material: { type: 'solid', params: { color: '#55f0c4', emissive: '#1fd8aa', emissiveIntensity: 0.7 } } }] } },
      MotionSource: { type: 'static', params: {} },
      Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.2, actions: [
        { type: 'incrementMetric', target: 'other', params: { metric: 'score', delta: 10 } },
        { type: 'heal', target: 'other', params: { amount: 5 } },
        { type: 'kill', target: 'self', params: {} }
      ] }]
    });

    registerArchetype('arena_enemy', {
      Info: { name: 'Arena Drone', description: 'Contact hazard that awards score when defeated.' },
      Body: { type: 'composite', params: { parts: [{ geometry: { type: 'capsule', params: { radius: 0.45, height: 1.2 } }, material: { type: 'solid', params: { color: '#ff5a6a' } } }] } },
      MotionSource: { type: 'dynamicRigidBody', params: { mass: 1 } },
      Health: { value: 20, max: 20 },
      Faction: { id: 'enemy' },
      Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.8, actions: [
        { type: 'damage', target: 'other', params: { amount: 8 } }
      ] }]
    });

    for (let i = 0; i < 8; i += 1) {
      const t = (i / 8) * Math.PI * 2;
      spawn('arena_pickup', { Transform: { x: Math.cos(t) * 10, y: 0.45, z: Math.sin(t) * 10 } });
    }

    for (let i = 0; i < 6; i += 1) {
      const t = (i / 6) * Math.PI * 2 + 0.25;
      spawn('arena_enemy', { Transform: { x: Math.cos(t) * 13, y: 1, z: Math.sin(t) * 13 } });
    }

    spawn('player', {
      Transform: { x: 0, y: 1.2, z: 12 },
      Inventory: { size: 4, items: [], selectedItemIndex: 0 },
      Health: { value: 100, max: 100 },
      Faction: { id: 'player_faction' },
      Metrics: { score: 0 }
    });
  }
};
