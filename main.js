const WORLD_SEED = 1337;
const WORLD_LIMIT = 26;
const WATER_LEVEL = 2;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.35;

const blockTypes = {
  grass: { color: 0x64b64c, label: 'Grass' },
  dirt: { color: 0x8d5b3b, label: 'Dirt' },
  stone: { color: 0x7c8087, label: 'Stone' },
  sand: { color: 0xe8d39c, label: 'Sand' },
  wood: { color: 0x8d5c36, label: 'Wood' },
  planks: { color: 0xc89a5b, label: 'Planks' },
  leaves: { color: 0x3d8c2b, label: 'Leaves' },
  water: { color: 0x4e9dfc, label: 'Water', transparent: true },
  crafting_table: { color: 0x8b5d37, label: 'Crafting Table' },
};

const inventory = [
  { id: 'grass', name: 'Grass', count: 18 },
  { id: 'dirt', name: 'Dirt', count: 24 },
  { id: 'stone', name: 'Stone', count: 18 },
  { id: 'sand', name: 'Sand', count: 12 },
  { id: 'wood', name: 'Wood', count: 12 },
];

const hotbarOrder = ['grass', 'dirt', 'stone', 'sand', 'wood'];

const craftingRecipes = {
  planks: { input: { wood: 1 }, output: { planks: 4 } },
  crafting_table: { input: { planks: 4 }, output: { crafting_table: 1 } },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 18, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(18, 32, 12);
scene.add(sun);

const blockMap = new Map();
const blockKey = (x, y, z) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
const keys = {};

const player = {
  position: new THREE.Vector3(0, 8, 8),
  velocity: new THREE.Vector3(),
  radius: PLAYER_RADIUS,
  height: PLAYER_HEIGHT,
  speed: 6.2,
  jumpStrength: 7.8,
  gravity: 18,
  onGround: false,
  yaw: 0,
  pitch: 0,
  health: 20,
  hunger: 20,
};

let selectedSlot = 0;
let started = false;
let paused = false;
let craftingOpen = false;
let miningTarget = null;
let miningProgress = 0;
let timeOfDay = 0.25;

const hud = {
  health: document.getElementById('health'),
  hunger: document.getElementById('hunger'),
  info: document.getElementById('info'),
};

const mobs = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();

function seededNoise(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7 + WORLD_SEED * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function terrainHeight(x, z) {
  const sample = seededNoise(x, z);
  const hills = Math.sin((x + 5) * 0.5) * 2.2 + Math.cos((z - 3) * 0.55) * 2.5 + (sample - 0.5) * 3.4;
  const height = Math.floor(5 + hills);
  return Math.max(2, Math.min(10, height));
}

function addBlock(x, y, z, type = 'dirt') {
  const key = blockKey(x, y, z);
  if (blockMap.has(key)) return;

  const blockType = blockTypes[type] || blockTypes.dirt;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({
      color: blockType.color,
      transparent: !!blockType.transparent,
      opacity: blockType.transparent ? 0.8 : 1,
      roughness: 0.95,
      metalness: 0.03,
    })
  );

  mesh.position.set(x, y, z);
  mesh.userData.type = type;
  world.add(mesh);
  blockMap.set(key, mesh);
}

function removeBlock(x, y, z) {
  const key = blockKey(x, y, z);
  const mesh = blockMap.get(key);
  if (!mesh) return;
  world.remove(mesh);
  blockMap.delete(key);
}

function generateTree(x, y, z) {
  for (let oy = 0; oy < 4; oy += 1) {
    addBlock(x, y + oy, z, 'wood');
  }

  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dz = -2; dz <= 2; dz += 1) {
      for (let dy = 0; dy <= 2; dy += 1) {
        const dist = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
        if (dist <= 4 && Math.random() > 0.12) {
          addBlock(x + dx, y + 3 + dy, z + dz, 'leaves');
        }
      }
    }
  }
}

function generateTerrain() {
  for (let x = -WORLD_LIMIT; x <= WORLD_LIMIT; x += 1) {
    for (let z = -WORLD_LIMIT; z <= WORLD_LIMIT; z += 1) {
      const height = terrainHeight(x, z);
      for (let y = 0; y <= height; y += 1) {
        let type = 'stone';
        if (y === height) type = 'grass';
        else if (y > height - 3) type = 'dirt';
        if (y <= WATER_LEVEL) type = 'sand';
        addBlock(x, y, z, type);
      }

      if (height >= 5 && seededNoise(x, z) > 0.82) {
        generateTree(x, height + 1, z);
      }

      for (let y = 0; y <= WATER_LEVEL; y += 1) {
        addBlock(x, y, z, 'water');
      }
    }
  }
}

function saveWorld() {
  const blocks = [];
  for (const mesh of blockMap.values()) {
    const p = mesh.position;
    blocks.push({ x: p.x, y: p.y, z: p.z, type: mesh.userData.type });
  }
  localStorage.setItem('minecraft-clone-world', JSON.stringify(blocks));
}

function loadWorld() {
  const raw = localStorage.getItem('minecraft-clone-world');
  if (!raw) return false;

  try {
    const blocks = JSON.parse(raw);
    if (!Array.isArray(blocks) || blocks.length === 0) return false;

    for (const mesh of blockMap.values()) {
      world.remove(mesh);
    }
    blockMap.clear();

    for (const block of blocks) {
      addBlock(block.x, block.y, block.z, block.type);
    }
    return true;
  } catch (err) {
    console.warn('Failed to load world:', err);
    return false;
  }
}

function ensureWorld() {
  if (!loadWorld()) {
    generateTerrain();
    saveWorld();
  }
}

function buildHotbar() {
  const hotbar = document.getElementById('hotbar');
  hotbar.innerHTML = '';

  inventory.forEach((item, index) => {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';
    if (index === selectedSlot) slot.classList.add('selected');
    slot.innerHTML = `<span class="name">${item.name}</span><span class="count">x${item.count}</span>`;
    slot.addEventListener('click', () => {
      selectedSlot = index;
      updateHotbar();
    });
    hotbar.appendChild(slot);
  });
}

function updateHotbar() {
  const slots = document.querySelectorAll('.hotbar-slot');
  slots.forEach((slot, index) => {
    slot.classList.toggle('selected', index === selectedSlot);
    const item = inventory[index];
    if (item) {
      slot.innerHTML = `<span class="name">${item.name}</span><span class="count">x${item.count}</span>`;
    }
  });
}

function addItemToInventory(itemId, count = 1) {
  const entry = inventory.find((item) => item.id === itemId);
  if (entry) {
    entry.count += count;
    updateHotbar();
    return true;
  }

  inventory.push({ id: itemId, name: itemId, count });
  updateHotbar();
  return true;
}

function removeItemFromInventory(itemId, count = 1) {
  const entry = inventory.find((item) => item.id === itemId);
  if (!entry || entry.count < count) return false;
  entry.count -= count;
  if (entry.count <= 0) entry.count = 0;
  updateHotbar();
  return true;
}

function craftItem(recipeKey) {
  const recipe = craftingRecipes[recipeKey];
  if (!recipe) return false;

  const canCraft = Object.entries(recipe.input).every(([id, amount]) => {
    const item = inventory.find((entry) => entry.id === id);
    return item && item.count >= amount;
  });

  if (!canCraft) return false;

  Object.entries(recipe.input).forEach(([id, amount]) => removeItemFromInventory(id, amount));
  Object.entries(recipe.output).forEach(([id, amount]) => addItemToInventory(id, amount));
  updateCraftingUI();
  return true;
}

function updateCraftingUI() {
  const panel = document.getElementById('crafting-panel');
  if (!panel) return;
  const buttons = panel.querySelectorAll('button[data-recipe]');
  buttons.forEach((button) => {
    button.onclick = () => craftItem(button.dataset.recipe);
  });
}

function collidesWithWorld(pos, radius = PLAYER_RADIUS) {
  const bounds = {
    minX: pos.x - radius,
    maxX: pos.x + radius,
    minY: pos.y,
    maxY: pos.y + player.height,
    minZ: pos.z - radius,
    maxZ: pos.z + radius,
  };

  for (const mesh of blockMap.values()) {
    const blockPos = mesh.position;
    const minX = blockPos.x - 0.5;
    const maxX = blockPos.x + 0.5;
    const minY = blockPos.y - 0.5;
    const maxY = blockPos.y + 0.5;
    const minZ = blockPos.z - 0.5;
    const maxZ = blockPos.z + 0.5;

    const overlap =
      bounds.minX < maxX &&
      bounds.maxX > minX &&
      bounds.minY < maxY &&
      bounds.maxY > minY &&
      bounds.minZ < maxZ &&
      bounds.maxZ > minZ;

    if (overlap) return true;
  }

  return false;
}

function movePlayer(delta) {
  if (!started || paused) return;

  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

  const move = new THREE.Vector3();
  if (keys['w']) move.add(forward);
  if (keys['s']) move.sub(forward);
  if (keys['a']) move.sub(right);
  if (keys['d']) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(player.speed * delta);

    const nextX = player.position.clone();
    nextX.x += move.x;
    if (!collidesWithWorld(nextX)) player.position.x = nextX.x;

    const nextZ = player.position.clone();
    nextZ.z += move.z;
    if (!collidesWithWorld(nextZ)) player.position.z = nextZ.z;
  }

  if (keys[' '] && player.onGround) {
    player.velocity.y = player.jumpStrength;
    player.onGround = false;
  }

  player.velocity.y -= player.gravity * delta;

  const nextY = player.position.clone();
  nextY.y += player.velocity.y * delta;
  if (!collidesWithWorld(nextY)) {
    player.position.y = nextY.y;
  } else {
    if (player.velocity.y < 0) {
      player.onGround = true;
      player.velocity.y = 0;
      player.position.y = Math.floor(player.position.y) + 1.8;
    } else {
      player.velocity.y = 0;
    }
  }

  if (player.position.y < 2.2) {
    player.position.y = 2.2;
    player.velocity.y = 0;
    player.onGround = true;
  }

  camera.position.set(player.position.x, player.position.y + 0.8, player.position.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function setStarted() {
  started = true;
  paused = false;
  craftingOpen = false;
  document.getElementById('start-overlay').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('crafting-panel').classList.add('hidden');
  renderer.domElement.requestPointerLock();
}

function togglePause() {
  if (!started) return;
  paused = !paused;
  document.getElementById('pause-overlay').classList.toggle('hidden', !paused);
  if (paused) {
    document.exitPointerLock?.();
  } else {
    renderer.domElement.requestPointerLock();
  }
}

function toggleCrafting() {
  if (!started) return;
  craftingOpen = !craftingOpen;
  document.getElementById('crafting-panel').classList.toggle('hidden', !craftingOpen);
  if (craftingOpen) {
    document.exitPointerLock?.();
  } else {
    renderer.domElement.requestPointerLock();
  }
}

function getTargetBlock() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(Array.from(blockMap.values()), false);
  return hits.length ? hits[0] : null;
}

function placeBlock() {
  if (!started || paused || craftingOpen) return;

  const hit = getTargetBlock();
  if (!hit) return;

  const placePos = hit.object.position.clone().add(hit.face.normal.clone());
  const item = inventory[selectedSlot];
  if (!item || item.count <= 0) return;

  const box = {
    minX: player.position.x - 0.4,
    maxX: player.position.x + 0.4,
    minY: player.position.y,
    maxY: player.position.y + player.height,
    minZ: player.position.z - 0.4,
    maxZ: player.position.z + 0.4,
  };

  const targetBox = {
    minX: placePos.x - 0.5,
    maxX: placePos.x + 0.5,
    minY: placePos.y - 0.5,
    maxY: placePos.y + 0.5,
    minZ: placePos.z - 0.5,
    maxZ: placePos.z + 0.5,
  };

  const overlaps =
    box.minX < targetBox.maxX &&
    box.maxX > targetBox.minX &&
    box.minY < targetBox.maxY &&
    box.maxY > targetBox.minY &&
    box.minZ < targetBox.maxZ &&
    box.maxZ > targetBox.minZ;

  if (overlaps) return;

  addBlock(Math.round(placePos.x), Math.round(placePos.y), Math.round(placePos.z), item.id);
  item.count -= 1;
  updateHotbar();
  saveWorld();
}

function mineBlock() {
  if (!started || paused || craftingOpen) return;

  const hit = getTargetBlock();
  if (!hit) return;

  const { object } = hit;
  const type = object.userData.type;
  if (type === 'water') return;

  const target = object.position;
  if (type) {
    const entry = inventory.find((item) => item.id === type);
    if (entry) entry.count += 1;
    else addItemToInventory(type, 1);
  }

  removeBlock(target.x, target.y, target.z);
  updateHotbar();
  saveWorld();
}

function spawnMob(x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.2, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xff4d4d })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);

  mobs.push({
    mesh,
    health: 3,
    speed: 1.3 + Math.random() * 0.7,
    damageCooldown: 0,
  });
}

function spawnMobs() {
  for (let i = 0; i < 8; i += 1) {
    const x = Math.random() * 30 - 15;
    const z = Math.random() * 30 - 15;
    const height = terrainHeight(Math.round(x), Math.round(z));
    spawnMob(x, height + 1.2, z);
  }
}

function updateMobs(delta) {
  for (const mob of mobs) {
    const toPlayer = player.position.clone().sub(mob.mesh.position);
    const horizontal = new THREE.Vector3(toPlayer.x, 0, toPlayer.z);
    const dist = horizontal.length();

    if (dist > 0.1) {
      horizontal.normalize();
      const nextPos = mob.mesh.position.clone();
      nextPos.x += horizontal.x * mob.speed * delta;
      nextPos.z += horizontal.z * mob.speed * delta;
      if (!collidesWithWorld(nextPos, 0.4)) {
        mob.mesh.position.x = nextPos.x;
        mob.mesh.position.z = nextPos.z;
      }
    }

    const distanceToPlayer = player.position.distanceTo(mob.mesh.position);
    if (distanceToPlayer < 1.4) {
      if (mob.damageCooldown <= 0) {
        player.health = Math.max(0, player.health - 1);
        mob.damageCooldown = 1.0;
      }
    }

    mob.damageCooldown = Math.max(0, mob.damageCooldown - delta);
  }
}

function updateSky(delta) {
  timeOfDay = (timeOfDay + delta * 0.03) % 1;
  const angle = timeOfDay * Math.PI * 2 - Math.PI / 2;
  const sunStrength = Math.max(0, Math.sin(angle));

  const dayColor = new THREE.Color(0x87ceeb);
  const nightColor = new THREE.Color(0x08111d);
  const lerped = dayColor.clone().lerp(nightColor, 1 - sunStrength);
  scene.background.copy(lerped);
  scene.fog.color.copy(lerped);

  ambient.intensity = 0.2 + sunStrength * 0.9;
  sun.intensity = 0.2 + sunStrength * 1.2;
  sun.position.set(Math.cos(angle) * 30, Math.sin(angle) * 30 + 10, Math.sin(angle) * 20);
}

function updateHud() {
  hud.health.textContent = `Health: ${Math.ceil(player.health)}`;
  hud.hunger.textContent = `Hunger: ${Math.ceil(player.hunger)}`;

  if (craftingOpen) hud.info.textContent = 'Crafting';
  else if (paused) hud.info.textContent = 'Paused';
  else hud.info.textContent = 'Survival Mode';
}

function updateMining() {
  if (!miningTarget) return;
  miningProgress += 0.08;
  if (miningProgress >= 1) {
    const type = miningTarget.object.userData.type;
    if (type && type !== 'water') {
      const entry = inventory.find((item) => item.id === type);
      if (entry) entry.count += 1;
      else addItemToInventory(type, 1);
    }

    removeBlock(
      miningTarget.object.position.x,
      miningTarget.object.position.y,
      miningTarget.object.position.z
    );
    saveWorld();
    miningTarget = null;
    miningProgress = 0;
    updateHotbar();
  }
}

function updateCrosshair() {
  const crosshair = document.getElementById('crosshair');
  if (!crosshair) return;

  if (miningTarget) {
    crosshair.style.transform = `translate(-50%, -50%) scale(${1 + miningProgress * 0.6})`;
  } else {
    crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === 'e') saveWorld();
  if (key === 'r') {
    loadWorld();
    player.position.set(0, 8, 8);
  }
  if (key === 'c') toggleCrafting();
  if (key === 'escape') togglePause();

  if (['1', '2', '3', '4', '5'].includes(key)) {
    selectedSlot = Number(key) - 1;
    updateHotbar();
  }

  if (event.code === 'Space') event.preventDefault();
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('mousemove', (event) => {
  if (!started || paused || craftingOpen) return;
  if (document.pointerLockElement !== renderer.domElement) return;

  player.yaw -= event.movementX * 0.002;
  player.pitch -= event.movementY * 0.002;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
});

renderer.domElement.addEventListener('click', () => {
  if (!started) return;
  renderer.domElement.requestPointerLock();
});

window.addEventListener('mousedown', (event) => {
  if (!started || paused || craftingOpen) return;
  if (document.pointerLockElement !== renderer.domElement) return;

  if (event.button === 0) {
    const hit = getTargetBlock();
    if (hit) {
      miningTarget = hit;
      miningProgress = 0;
    }
  }

  if (event.button === 2) {
    placeBlock();
  }
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    const hit = miningTarget;
    if (hit) {
      const type = hit.object.userData.type;
      if (type && type !== 'water') {
        const entry = inventory.find((item) => item.id === type);
        if (entry) entry.count += 1;
        else addItemToInventory(type, 1);
      }
      removeBlock(hit.object.position.x, hit.object.position.y, hit.object.position.z);
      saveWorld();
      miningTarget = null;
      miningProgress = 0;
      updateHotbar();
    }
  }
});

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(0.033, clock.getDelta());

  movePlayer(delta);
  updateSky(delta);
  updateMobs(delta);
  updateMining();
  updateCrosshair();

  player.hunger = Math.max(0, player.hunger - delta * 0.02);
  if (player.hunger < 5) player.health = Math.max(0, player.health - delta * 0.1);

  updateHud();
  renderer.render(scene, camera);
}

buildHotbar();
updateHotbar();
updateCraftingUI();
ensureWorld();
spawnMobs();

const startButton = document.getElementById('start-button');
startButton.addEventListener('click', setStarted);

const resumeButton = document.getElementById('resume-button');
resumeButton.addEventListener('click', togglePause);

const craftingButtons = document.querySelectorAll('button[data-recipe]');
craftingButtons.forEach((button) => {
  button.addEventListener('click', () => craftItem(button.dataset.recipe));
});

animate();

window.addEventListener('contextmenu', (event) => event.preventDefault());
