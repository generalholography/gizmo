import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

import { world, addSystem, runSystems, getModule } from "./core/ecs";
import { physicsSystem }   from "./core/systems/physics";
import { renderingSystem } from "./core/systems/rendering";
import { spawn } from "./core/spawn";

async function bootstrap() {
  /* ---------- renderer & scene ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x222233);                  // 🔆 slight space-blue background
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  /* ---------- camera ---------- */
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 25, 40);
  camera.lookAt(0, 0, 0);

  /* ---------- lighting ---------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); // 🔆 soft sky light
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);          // 🔆 sun light
  dir.position.set(10, 30, 20);
  dir.castShadow = false;
  scene.add(dir);

  /* ---------- physics ---------- */
  await RAPIER.init();
  const rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  /* ---------- inject into ECS world ---------- */
  Object.assign(world, {
    three: { scene, renderer, camera },
    rapier: { world: rapierWorld }
  });

  /* ---------- register systems ---------- */
  addSystem((w) => { physicsSystem(1 / 60); return w; });
  addSystem((w) => { renderingSystem();    return w; });

  const archetypes = getModule(world, 'archetype');

  /* ---------- custom archetype ---------- */
  const ball = {
    Transform: { y: 5 },
    Renderer: {
      parts: [
        {
          mesh: { type: "primitive", params: { shape: "sphere", radius: 1 } },
          material: { type: "solid", params: { color: "#ff2222" } }
        }
      ]
    },
    PhysicsBody: {
      bodyType: "dynamic",
      mass: 1,
      collider: { type: "primitive", params: { shape: "sphere", radius: 1 } }
    }
  };
  archetypes.register("ball", { type: "bundle", params: ball });

  /* ---------- spawn demo entities ---------- */
  spawn("terrain"); // built-in archetype
  spawn("cube", { Transform: { y: 15 } }); // built-in with override
  spawn("ball"); // custom archetype registered above
  spawn({ // bespoke entity using direct bundle
    Transform: { x: -5, y: 10 },
    Renderer: {
      parts: [
        {
          mesh: { type: "hollowCylinder", params: { outerRadius: 1, innerRadius: 0.6, height: 2 } },
          material: { type: "solid", params: { color: "#88ccff" } }
        }
      ]
    },
    PhysicsBody: {
      bodyType: "dynamic",
      mass: 2,
      collider: { type: "primitive", params: { shape: "cylinder", size: [1, 2, 1] } }
    }
  });

  /* ---------- main loop ---------- */
  function tick() {
    runSystems(world);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
bootstrap();