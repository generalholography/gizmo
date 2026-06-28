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
      title: 'Three Key Puzzle Vault',
      description: 'A small dungeon loop with readable lanes, keys, doors, signs, and a final reward.',
      tags: ['game', 'puzzle', 'dungeon'],
      dimensions: [{ name: 'Vault', gravity: -9.81, useDayNightCycle: false, sky: { color: '#20212a', sun: { color: '#fff2cc', intensity: 0.65, timeOfDay: 900 }, clouds: { color: '#3b3d4a', coverage: 0.1 }, stars: { intensity: 0.1 } } }],
      achievements: []
    });

    spawn(boxEntity('Final Gate', 16, 2, 0, 1, 4, 8, '#915c3a'));
    spawn(boxEntity('Reward Shrine', 20, 1, 0, 2.2, 2, 2.2, '#d6b45f'));

    registerArchetype('vault_key', {
      Info: { name: 'Vault Key', description: 'Collect to open progress toward the final gate.' },
      Body: { type: 'composite', params: { parts: [{ geometry: { type: 'star', params: { outerRadius: 0.6, innerRadius: 0.28, points: 6, height: 0.16 } }, material: { type: 'solid', params: { color: '#ffd35a', emissive: '#ffb000', emissiveIntensity: 0.45 } } }] } },
      MotionSource: { type: 'static', params: {} },
      Rules: [{ trigger: { type: 'collisionEnter' }, cooldown: 0.2, actions: [
        { type: 'incrementMetric', target: 'other', params: { metric: 'keys', delta: 1 } },
        { type: 'popup', target: 'other', params: { text: 'Key collected.' } },
        { type: 'kill', target: 'self', params: {} }
      ] }]
    });

    registerArchetype('lesson_sign', {
      Info: { name: 'Puzzle Sign', description: 'Interact for instructions.' },
      Body: { type: 'composite', params: { parts: [boxPart(2.8, 1.4, 0.2, '#e7dcc4')] } },
      MotionSource: { type: 'static', params: {} },
      Rules: [{ trigger: { type: 'interact' }, cooldown: 0.4, actions: [
        { type: 'popup', target: 'other', params: { text: 'Collect three keys, then cross the final gate.' } }
      ] }]
    });

    for (let lane = -1; lane <= 1; lane += 1) {
      spawn(boxEntity(`Lane ${lane + 2} Marker`, -4, 0.1, lane * 7, 14, 0.2, 4, lane === 0 ? '#5d7285' : '#575c72'));
      spawn('vault_key', { Transform: { x: -6 + lane * 2, y: 0.08, z: lane * 7 + 3 } });
      spawn('lesson_sign', { Transform: { x: -13.5, y: 0.7, z: lane * 7 } });
    }

    spawn({
      Info: { name: 'Final Gate Trigger', description: 'Crossing with three keys completes the vault.' },
      Transform: { x: 14.5, y: 1, z: 0 },
      Body: { type: 'composite', params: { parts: [boxPart(1, 2, 8, '#6bd0ff')] } },
      MotionSource: { type: 'static', params: {} },
      Rules: [{ trigger: { type: 'entityInRange', params: { range: 2 } }, cooldown: 1, conditions: [
        {
          type: 'compare',
          params: {
            operator: 'gte',
            left: { type: 'metric', params: { metric: 'keys', subject: 'other', defaultValue: 0 } },
            right: { type: 'literal', params: { value: 3 } }
          }
        }
      ], actions: [
        { type: 'popup', target: 'other', params: { text: 'Vault opened. You win.' } },
        { type: 'incrementMetric', target: 'other', params: { metric: 'score', delta: 100 } }
      ] }]
    });

    spawn('player', {
      Transform: { x: -16, y: 1.2, z: 0 },
      Inventory: { size: 4, items: [], selectedItemIndex: 0 },
      Metrics: { keys: 0, score: 0 }
    });
  }
};
