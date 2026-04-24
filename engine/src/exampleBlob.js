export default {
      setupScene(api) {
        console.log('Setting up scene with RAPIER physics and noisy terrain');
        const { worldRoot, physicsWorld, THREE, RAPIER, createNoise2D } = api;

        // — Noisy Terrain —
        const noise = createNoise2D();
        const size = 30, segs = 60;
        const geo = new THREE.PlaneGeometry(size, size, segs, segs);
        geo.rotateX(-Math.PI / 2);

        // Pure JS: no "as" type assertions
        const posAttr = geo.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
          v.fromBufferAttribute(posAttr, i);
          v.y = noise(v.x * 0.1, v.z * 0.1) * 2.5;
          posAttr.setXYZ(i, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({ color: 0x3366ff });
        const terrain = new THREE.Mesh(geo, mat);
        worldRoot.add(terrain);

        // — Physics Ground —
        const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
        const groundBody = physicsWorld.createRigidBody(groundDesc);
        physicsWorld.createCollider(
          RAPIER.ColliderDesc.cuboid(size / 2, 0.1, size / 2),
          groundBody
        );

        // — Bouncing Sphere —
        const sphGeo = new THREE.SphereGeometry(1, 32, 16);
        const sphMat = new THREE.MeshStandardMaterial({ color: 0xff5533 });
        const sphere = new THREE.Mesh(sphGeo, sphMat);
        sphere.position.set(0, 10, 0);
        worldRoot.add(sphere);

        const sphDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 10, 0);
        const sphBody = physicsWorld.createRigidBody(sphDesc);
        physicsWorld.createCollider(RAPIER.ColliderDesc.ball(1), sphBody);

        // Store for tick
        this._sphere = { mesh: sphere, body: sphBody };
      },
      tick(delta, api) {
        // Sync physics → mesh
        const s = this._sphere;
        if (s) {
          const t = s.body.translation();
          s.mesh.position.set(t.x, t.y, t.z);
          // Rotate it
          s.mesh.rotation.y += delta;
        }
      }
    };