import { LifecycleEvent, loadDependencies, startEngine } from './index';
import exampleEngineBlob from './exampleEngineBlob.js?raw';
import wildernesWorld from './worlds/wilderness.js?raw';
import dungeonCrawler from './worlds/dungeon-crawler.js?raw';
import mars from './worlds/mars.js?raw';
import city from './worlds/city.js?raw';
import zombie from './worlds/zombie.js?raw';
import arcticOutpost from './worlds/arctic-outpost.js?raw';
import golf from './worlds/golf.js?raw';
import kingdom from './worlds/kingdom.js?raw';
import space from './worlds/space-battle.js?raw';
import renaissance from './worlds/renaissance.js?raw';
import soccer from './worlds/soccer.js?raw';
import townBuilder from './worlds/town-builder.js?raw';
import farmstead from './worlds/farmstead.js?raw';
import storeRuleDemo from './worlds/store-rule-demo-world.js?raw';
import geometryPlayground from './worlds/geometry-playground-world.js?raw';
import assetWedgeDemo from './worlds/asset-wedge-demo-world.js?raw';
import runtimeModuleTypeDemo from './worlds/runtime-module-type-script-demo.js?raw';
import dropper from './worlds/dropper.js?raw';
import { setupWebControls } from './setupWebControls';

const worlds = {
    'Example World': exampleEngineBlob,
    'Wilderness': wildernesWorld,
    'Dungeon Crawler': dungeonCrawler,
    'Mars': mars,
    'City': city,
    'Zombie': zombie,
    'Arctic Sabotage': arcticOutpost,
    'Golf': golf,
    'Kingdom': kingdom,
    'Space': space,
    'Renaissance': renaissance,
    'Soccer': soccer,
    'Town Builder': townBuilder,
    'Farmstead Growth Demo': farmstead,
    'Store Rule Demo': storeRuleDemo,
    'Asset Wedge Demo': assetWedgeDemo,
    'Geometry Playground': geometryPlayground,
    'Runtime Module Type Demo': runtimeModuleTypeDemo,
    'Dropper': dropper,
};

let engine = null;

async function runWorld(worldBlob) {
    await loadDependencies();
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    engine = startEngine(canvas, { debug: false, display: false, hudVisible: true });

    setupWebControls(engine, canvas);

    await engine.loadWorld(worldBlob);

    engine.setDeathScreenButtons([
        {
            text: 'Reload',
            callback: () => window.location.reload(),
        },
    ]);

    engine.lifecycleEvents.on(LifecycleEvent.QUIT, () => {
        document.body.removeChild(canvas);
        showMenu();
    });
}

function showMenu() {
    if (engine) {
        engine.dispose();
        engine = null;
    }
    
    const menu = document.createElement('div');
    menu.style.position = 'absolute';
    menu.style.top = '50%';
    menu.style.left = '50%';
    menu.style.transform = 'translate(-50%, -50%)';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.gap = '10px';
    document.body.appendChild(menu);

    for (const [name, blob] of Object.entries(worlds)) {
        const btn = document.createElement('button');
        btn.textContent = name;
        btn.onclick = () => {
            document.body.removeChild(menu);
            runWorld(blob);
        };
        menu.appendChild(btn);
    }
}

runWorld(assetWedgeDemo);
