import { EngineMode, loadDependencies, startEngine } from './index';
import runtimeModuleTypeDemo from './worlds/runtime-module-type-script-demo.js?raw';
import geometryPlayground from './worlds/geometry-playground-world.js?raw';
import assetWedgeDemo from './worlds/asset-wedge-demo-world.js?raw';

let engine = null;

const worlds = {
    assetWedgeDemo,
    runtimeModuleTypeDemo,
    geometryPlayground,
};

function resolveWorldScript() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('world');
    if (requested && requested in worlds) {
        return {
            key: requested,
            script: worlds[requested],
        };
    }

    return {
        key: 'assetWedgeDemo',
        script: assetWedgeDemo,
    };
}

async function runEditorMode() {
    await loadDependencies();
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // Start engine in EDITOR mode - this is critical!
    engine = startEngine(canvas, { 
        mode: EngineMode.EDITOR,
        hudVisible: true 
    });

    const world = resolveWorldScript();
    await engine.loadWorld(world.script);

    console.log('═══════════════════════════════════════════════════');
    console.log('Editor mode started successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Loaded demo world: ${world.key}`);
    console.log('Available world query params:');
    console.log('  ?world=assetWedgeDemo');
    console.log('  ?world=runtimeModuleTypeDemo');
    console.log('  ?world=geometryPlayground');
    console.log('');
    console.log('Runtime Module Type Demo flow:');
    console.log('  1. Open Inspector > Save World to download JSON');
    console.log('  2. Use Hierarchy > Load to load the downloaded JSON');
    console.log('  3. Confirm the displaced plane still uses pulseMask after reload');
    console.log('  4. Inspect saved JSON for moduleTypes[] and modules.field[]');
    console.log('');
    console.log('Editor Controls:');
    console.log('  Camera:');
    console.log('    - WASD / Arrow Keys: Move camera');
    console.log('    - Right Mouse Drag: Look around');
    console.log('    - Mouse Wheel: Zoom');
    console.log('');
    console.log('  Selection & Transform:');
    console.log('    - Left Click: Select entity');
    console.log('    - J: Translate tool');
    console.log('    - K: Rotate tool');
    console.log('    - L: Scale tool');
    console.log('    - X: Toggle world/local space');
    console.log('    - Shift: Enable snapping');
    console.log('');
    console.log('  Undo/Redo:');
    console.log('    - Ctrl+Z: Undo');
    console.log('    - Ctrl+Shift+Z or Ctrl+Y: Redo');
    console.log('');
    console.log('  Play Mode:');
    console.log('    - Ctrl+P or Play button: Toggle play/stop');
    console.log('');
    console.log('  UI Panels:');
    console.log('    - Toolbar: Top center (tools, play/stop, undo/redo)');
    console.log('    - Hierarchy: Left side (entity list)');
    console.log('    - Inspector: Right side (entity properties)');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('TIP: Press Play to test physics and gameplay systems.');
    console.log('     Press Stop to return to editor state.');
    console.log('═══════════════════════════════════════════════════');
}

runEditorMode();
