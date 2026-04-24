import { EngineMode, LifecycleEvent, loadDependencies, startEngine } from './index';

let engine = null;

// Debug world script with comprehensive logging
const debugWorldScript = `
export default {
  setupScene(api) {
    const { spawn, setResource, ctx } = api;
    
    console.log('%c═══════════════════════════════════════════════════', 'color: #00ff00; font-weight: bold');
    console.log('%c🔍 DEBUG: Editor Test World Initialization', 'color: #00ff00; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════', 'color: #00ff00; font-weight: bold');
    
    // Log initial isPlaying state
    console.log('🔍 [INIT] ctx.isPlaying at setupScene start:', ctx.isPlaying);
    console.log('🔍 [INIT] Expected: false (editor mode)');
    
    if (ctx.isPlaying === true) {
      console.error('❌ [ERROR] ctx.isPlaying is TRUE at setupScene!');
      console.error('❌ [ERROR] This means physics will run immediately!');
      console.error('❌ [ERROR] Expected FALSE in editor mode before Play pressed.');
    } else {
      console.log('✅ [OK] ctx.isPlaying is false - physics deferred correctly');
    }
    
    // Set world metadata
    setResource('metadata', {
      title: "Debug Test World",
      description: "World with comprehensive debug logging",
      dimensions: [{
        name: "base",
        gravity: -20,
        sky: {
          color: "#87CEEB",
          sunDirection: { x: 0, y: -1, z: 0.5 },
          sunIntensity: 1.0
        }
      }]
    });
    
    console.log('🔍 [SPAWN] Spawning test entities...');
    
    // Spawn test cubes with logging
    const cube1 = spawn("cube", { 
      Transform: { x: 0, y: 5, z: 0 },
      Info: { name: "Debug Cube 1" }
    });
    console.log('🔍 [SPAWN] Cube 1 spawned at Y=5, EID:', cube1);
    
    const cube2 = spawn("cube", { 
      Transform: { x: 3, y: 5, z: 0 },
      Info: { name: "Debug Cube 2" }
    });
    console.log('🔍 [SPAWN] Cube 2 spawned at Y=5, EID:', cube2);
    
    const cube3 = spawn("cube", { 
      Transform: { x: -3, y: 5, z: 0 },
      Info: { name: "Debug Cube 3" }
    });
    console.log('🔍 [SPAWN] Cube 3 spawned at Y=5, EID:', cube3);
    
    const ground = spawn("terrain", { 
      Transform: { x: 0, y: 0, z: 0 },
      Info: { name: "Ground" }
    });
    console.log('🔍 [SPAWN] Ground spawned at Y=0, EID:', ground);
    
    // Monitor cube positions every second
    let frameCount = 0;
    const monitorInterval = setInterval(() => {
      frameCount++;
      const Transform = ctx.Transform;
      const y1 = Transform.y[cube1];
      const y2 = Transform.y[cube2];
      const y3 = Transform.y[cube3];
      
      console.log(\`%c🔍 [MONITOR] Frame \${frameCount} - isPlaying: \${ctx.isPlaying}\`, 'color: #00aaff');
      console.log(\`   Cube 1 Y: \${y1.toFixed(3)}\`);
      console.log(\`   Cube 2 Y: \${y2.toFixed(3)}\`);
      console.log(\`   Cube 3 Y: \${y3.toFixed(3)}\`);
      
      // Check if cubes are falling when they shouldn't
      if (!ctx.isPlaying) {
        if (y1 < 4.9 || y2 < 4.9 || y3 < 4.9) {
          console.error('%c❌ [PHYSICS RUNNING] Cubes are falling while not playing!', 'color: #ff0000; font-weight: bold');
          console.error('❌ Expected Y ≥ 5.0, got:', { y1, y2, y3 });
          console.error('❌ isPlaying:', ctx.isPlaying);
          console.error('❌ This indicates physics systems are running incorrectly');
        }
      } else {
        console.log('   (Playing mode - cubes should fall)');
      }
    }, 1000);
    
    // Log isPlaying changes
    let lastIsPlaying = ctx.isPlaying;
    setInterval(() => {
      if (ctx.isPlaying !== lastIsPlaying) {
        console.log(\`%c🔍 [STATE CHANGE] isPlaying changed: \${lastIsPlaying} → \${ctx.isPlaying}\`, 'color: #ffaa00; font-weight: bold');
        lastIsPlaying = ctx.isPlaying;
      }
    }, 100);
    
    console.log('%c✅ [INIT] Setup complete', 'color: #00ff00; font-weight: bold');
    console.log('🔍 [INIT] Final ctx.isPlaying:', ctx.isPlaying);
    console.log('%c═══════════════════════════════════════════════════', 'color: #00ff00; font-weight: bold');
  }
};
`;

async function runEditorMode() {
    console.log('%c═══════════════════════════════════════════════════', 'color: #ff00ff; font-weight: bold');
    console.log('%c🔍 STARTING DEBUG EDITOR MODE', 'color: #ff00ff; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════', 'color: #ff00ff; font-weight: bold');
    
    await loadDependencies();
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    console.log('🔍 [ENGINE] Starting engine with EngineMode.EDITOR');
    console.log('🔍 [ENGINE] Expected ctx.isPlaying: false');
    
    // Start engine in EDITOR mode
    engine = startEngine(canvas, { 
        mode: EngineMode.EDITOR,
        hudVisible: true 
    });

    console.log('🔍 [ENGINE] Engine started');
    console.log('🔍 [ENGINE] Mode:', engine.mode);
    
    console.log('🔍 [WORLD] Loading test world...');
    await engine.loadWorld(debugWorldScript);
    console.log('🔍 [WORLD] World loaded');

    // Add editor dev UI
    createEditorDevUI();

    console.log('%c═══════════════════════════════════════════════════', 'color: #00ff00; font-weight: bold');
    console.log('%cDebug Editor Mode Started Successfully!', 'color: #00ff00; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════', 'color: #00ff00; font-weight: bold');
    console.log('');
    console.log('%c📊 MONITORING STATUS:', 'color: #00aaff; font-weight: bold');
    console.log('  • Position monitoring active (logs every second)');
    console.log('  • isPlaying state changes are logged');
    console.log('  • Cube Y positions should stay at 5.0 until Play pressed');
    console.log('');
    console.log('%c🎮 CONTROLS:', 'color: #ffaa00; font-weight: bold');
    console.log('  Camera: WASD/Arrows, Right-drag to look, Wheel to zoom');
    console.log('  Tools: J (translate), K (rotate), L (scale)');
    console.log('  Space: X (toggle world/local), Shift (snapping)');
    console.log('  Undo: Ctrl+Z, Redo: Ctrl+Shift+Z');
    console.log('  Play: Ctrl+P or Play button in UI');
    console.log('');
    console.log('%c🔍 WHAT TO WATCH:', 'color: #ff00ff; font-weight: bold');
    console.log('  1. Check "isPlaying" values in monitoring logs');
    console.log('  2. Watch cube Y positions - should stay at 5.0');
    console.log('  3. If Y < 5.0 before pressing Play → PHYSICS BUG');
    console.log('  4. Press Play button → cubes should fall');
    console.log('  5. Press Stop button → world should reset');
    console.log('');
    console.log('%c═══════════════════════════════════════════════════', 'color: #00ff00; font-weight: bold');
}

function createEditorDevUI() {
    const devPanel = document.createElement('div');
    devPanel.style.position = 'absolute';
    devPanel.style.top = '10px';
    devPanel.style.right = '10px';
    devPanel.style.background = 'rgba(0, 0, 0, 0.8)';
    devPanel.style.color = '#00ff00';
    devPanel.style.padding = '15px';
    devPanel.style.borderRadius = '5px';
    devPanel.style.fontFamily = 'monospace';
    devPanel.style.fontSize = '12px';
    devPanel.style.zIndex = '10000';
    devPanel.style.minWidth = '250px';

    const title = document.createElement('div');
    title.textContent = '🔍 DEBUG PANEL';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.fontSize = '14px';
    devPanel.appendChild(title);

    const isPlayingDiv = document.createElement('div');
    isPlayingDiv.id = 'debug-isPlaying';
    isPlayingDiv.style.marginBottom = '5px';
    devPanel.appendChild(isPlayingDiv);

    const physicsStatusDiv = document.createElement('div');
    physicsStatusDiv.id = 'debug-physics-status';
    physicsStatusDiv.style.marginBottom = '10px';
    devPanel.appendChild(physicsStatusDiv);

    // Update debug info every 100ms
    setInterval(() => {
        if (engine && engine.ctx) {
            const isPlaying = engine.ctx.isPlaying;
            isPlayingDiv.textContent = `isPlaying: ${isPlaying}`;
            isPlayingDiv.style.color = isPlaying ? '#ff00ff' : '#00ff00';
            
            if (!isPlaying) {
                physicsStatusDiv.textContent = '⏸️  Physics PAUSED';
                physicsStatusDiv.style.color = '#00ff00';
            } else {
                physicsStatusDiv.textContent = '▶️  Physics RUNNING';
                physicsStatusDiv.style.color = '#ff00ff';
            }
        }
    }, 100);

    document.body.appendChild(devPanel);
    console.log('🔍 [UI] Debug panel added to top-right corner');
}

// Start the debug editor
runEditorMode().catch(err => {
    console.error('%c❌ [FATAL ERROR]', 'color: #ff0000; font-weight: bold', err);
});
