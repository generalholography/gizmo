export default {
  setupScene(api) {
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

    const entities = [
      boxEntity('Central Beacon', 0, 2.0, 0, 1.2, 4.0, 1.2, '#d99a3d'),
      boxEntity('North Marker', 0, 1.0, -7, 2.0, 2.0, 0.6, '#5b8fb9'),
      boxEntity('South Marker', 0, 1.0, 7, 2.0, 2.0, 0.6, '#8fbc6b')
    ];

    for (let i = 0; i < 10; i += 1) {
      const t = (i / 10) * Math.PI * 2;
      entities.push(boxEntity(
        `Perimeter Lantern ${i + 1}`,
        Math.cos(t) * 7,
        0.7,
        Math.sin(t) * 7,
        0.35,
        1.4,
        0.35,
        i % 2 ? '#f1c76a' : '#c85f4f'
      ));
    }

    api.initialize({
      title: 'Starter Beacon Court',
      description: 'A simple complete worldscript template with a ground plane, landmarks, and repeated detail.',
      entities
    }, { merge: false, spawnEntities: true });
  }
};
