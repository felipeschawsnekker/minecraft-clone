import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

const blockTypes = {
  grass: { color: 0x5fbf4a, label: 'Grass' },
  dirt: { color: 0x8b5a3c, label: 'Dirt' },
  stone: { color: 0x7c7f89, label: 'Stone' },
  sand: { color: 0xe0d39a, label: 'Sand' },
  wood: { color: 0x9a6b42, label: 'Wood' },
  water: { color: 0x4ea1ff, label: 'Water', transparent: true },
};

const inventory = [
  { id: 'grass', name: 'Grass', color: 0x5fbf4a, count: 20 },
  { id: 'dirt', name: 'Dirt', color: 0x8b5a3c, count: 30 },
  { id: 'stone', name: 'Stone', color: 0x7c7f89, count: 30 },
  { id: 'wood', name: 'Wood', color: 0x9a6b42, count: 20 },
  { id: 'sand', name: 'Sand', color: 0xe0d39a, count: 20 },
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 20, 120);

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
sun.position.set(20, 30, 10);
scene.add(sun);

const blockMap = new Map();
const blockKey = (x, y, z) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;

const keys = {};
let selectedSlot = 0;
let started = false;
let paused = false;
let miningTarget = null;
let miningProgress = 0;

const player = {
  position: new THREE.Vector3(0, 8, 8),
  velocity: new THREE.Vector3(),
  radius: 0.35,
  height: 1.8,
  speed: 6.5,
  jumpStrength: 7.5,
  gravity: 20,
  onGround: false,
  yaw: 0,
  pitch: 0,
  health: 20,
  hunger: 20,
};

const hud = {
  health: document.getElementById('health'),
  hunger: document.getElementById('hunger'),
};

function buildHotbar() {
  const hotbar = document.getElementById('hotbar');
  inventory.forEach((item, index) => {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';
    if (index === selectedSlot) slot.classList.add('selected');
    slot.innerHTML = `<span class="name">${item.name}</span><span class="count">x${item.count}</span>`;
    slot.addEventListener('click', () => {
      selectedSlot = index;
      renderHotbar();
    });
    hotbar.appendChild(slot);
  });
}

function renderHotbar() {
  const slots = document.querySelectorAll('.hotbar-slot');
  slots.forEach((slot, index) => {
    slot.classList.toggle('selected', index === selectedSlot);
    const item = inventory[index];
    if (item) {
      slot.innerHTML = `<span class="name">${item.name}</span><span class="count">x${item.count}</span>`;
    }
  });
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
      opacity: blockType.transparent ? 0.75 : 1,
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

function terrainHeight(x, z) {
  const a = Math.sin(x * 0.6) * 2.5;
  const b = Math.cos(z * 0.7) * 2.2;
  const c = Math.sin((x + z) * 0.4) * 1.8;
  return Math.max(2, Math.min(8, Math.floor(4 + a + b + c)));
}

function generateTerrain() {
  for (let x = -28; x <= 28; x++) {
    for (let z = -28; z <= 28; z++) {
      const height = terrainHeight(x, z);
      for (let y = 0; y <= height; y++) {
        let type = 'stone';
        if (y === height) type = 'grass';
        else if (y > height - 3) type = 'dirt';
        if (y <= 2) type = 'sand';
        addBlock(x, y, z, type);
      }
    }
  }
}

function saveWorld() {
  const blocks = [];
  for (const mesh of blockMap.values()) {
    blocks.push({
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
      type: mesh.userData.type,
    });
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
    console.warn('Unable to load world:', err);
    return false;
  }
}

function ensureWorld() {
  if (!loadWorld()) {
    generateTerrain();
    saveWorld();
  }
}

function getPlayerBounds(position) {
  return {
    minX: position.x - player.radius,
    maxX: position.x + player.radius,
    minY: position.y,
    maxY: position.y + player.height,
    minZ: position.z - player.radius,
    maxZ: position.z + player.radius,
  };
}

function collidesWithWorld(pos, radius = player.radius) {
  const bounds = {
    minX: pos.x - radius,
    maxX: pos.x + radius,
    minY: pos.y,
    maxY: pos.y + player.height,
    minZ: pos.z - radius,
    maxZ: pos.z + radius,
  };

  for (const mesh of blockMap.values()) {
    const b = mesh.position;
    const minX = b.x - 0.5;
    const maxX = b.x + 0.5;
    const minY = b.y - 0.5;
    const maxY = b.y + 0.5;
    const minZ = b.z - 0.5;
    const maxZ = b.z + 0.5;

    const hit =
      bounds.minX < maxX &&
      bounds.maxX > minX &&
      bounds.minY < maxY &&
      bounds.maxY > minY &&
      bounds.minZ < maxZ &&
      bounds.maxZ > minZ;

    if (hit) return true;
  }

  return false;
}

function updateHud() {
  hud.health.textContent = `Health: ${Math.ceil(player.health)}`;
  hud.hunger.textContent = `Hunger: ${Math.ceil(player.hunger)}`;
}

function setStarted() {
  started = true;
  paused = false;
  document.getElementById('start-overlay').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  renderer.domElement.requestPointerLock();
}

function togglePause() {
  if (!started) return;
  paused = !paused;
  const pauseOverlay = document.getElementById('pause-overlay');
  pauseOverlay.classList.toggle('hidden', !paused);
  if (paused) {
    document.exitPointerLock?.();
  } else {
    renderer.domElement.requestPointerLock();
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === 'e') saveWorld();
  if (key === 'r') loadWorld();
  if (key === 'escape') {
    if (!started) return;
    togglePause();
  }

  if (['1', '2', '3', '4', '5'].includes(key)) {
    selectedSlot = Number(key) - 1;
    renderHotbar();
  }

  if (event.code === 'Space') event.preventDefault();
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

document.addEventListener('mousemove', (event) => {
  if (!started || paused) return;
  if (document.pointerLockElement !== renderer.domElement) return;

  player.yaw -= event.movementX * 0.002;
  player.pitch -= event.movementY * 0.002;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.domElement.addEventListener('click', () => {
  if (!started) return;
  renderer.domElement.requestPointerLock();
});

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

function getTargetBlock() {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(Array.from(blockMap.values()), false);
  return hits.length ? hits[0] : null;
}

function mineBlock() {
  if (!started || paused) return;
  const hit = getTargetBlock();
  if (!hit) return;

  const { x, y, z } = hit.object.position;
  const type = hit.object.userData.type;
  if (type) {
    const item = inventory.find((entry) => entry.id === type);
    if (item) item.count += 1;
    renderHotbar();
  }

  removeBlock(x, y, z);
  saveWorld();
}

function placeBlock() {
  if (!started || paused) return;
  const hit = getTargetBlock();
  if (!hit) return;

  const normal = hit.face.normal.clone();
  const blockPos = hit.object.position.clone();
  const placePos = blockPos.add(normal);

  const item = inventory[selectedSlot];
  if (!item || item.count <= 0) return;

  const p = player.position;
  const box = {
    minX: p.x - 0.4,
    maxX: p.x + 0.4,
    minY: p.y,
    maxY: p.y + player.height,
    minZ: p.z - 0.4,
    maxZ: p.z + 0.4,
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

  if (!overlaps) {
    addBlock(Math.round(placePos.x), Math.round(placePos.y), Math.round(placePos.z), item.id);
    item.count -= 1;
    renderHotbar();
    saveWorld();
  }
}

window.addEventListener('mousedown', (event) => {
  if (!started || paused) return;
  if (document.pointerLockElement !== renderer.domElement) return;

  if (event.button === 0) {
    miningTarget = getTargetBlock();
    miningProgress = 0;
  }

  if (event.button === 2) {
    placeBlock();
  }
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    if (miningTarget) {
      const hit = miningTarget;
      const { x, y, z } = hit.object.position;
      const type = hit.object.userData.type;
      if (type) {
        const entry = inventory.find((item) => item.id === type);
        if (entry) entry.count += 1;
      }
      removeBlock(x, y, z);
      saveWorld();
      miningTarget = null;
      miningProgress = 0;
    }
  }
});

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(0.033, clock.getDelta());
  movePlayer(delta);
  player.hunger = Math.max(0, player.hunger - delta * 0.02);
  if (player.hunger < 5) player.health = Math.max(0, player.health - delta * 0.2);
  updateHud();
  renderer.render(scene, camera);
}

const clock = new THREE.Clock();

buildHotbar();
renderHotbar();
ensureWorld();

const startButton = document.getElementById('start-button');
startButton.addEventListener('click', () => setStarted());

const resumeButton = document.getElementById('resume-button');
resumeButton.addEventListener('click', () => togglePause());

animate();

