import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 18, 90);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
document.body.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(12, 18, 10);
scene.add(sun);

const blockMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
const blockMap = new Map();
const blockKey = (x, y, z) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;

const inventory = [
  { id: 'grass', name: 'Grass', color: 0x6bbf59 },
  { id: 'dirt', name: 'Dirt', color: 0x8d6e63 },
  { id: 'stone', name: 'Stone', color: 0x7a7f87 },
  { id: 'wood', name: 'Wood', color: 0x9c6b53 },
];

let selectedSlot = 0;
let hitBlockInfo = null;
let miningProgress = 0;
let miningTarget = null;
let savedWorldData = null;

function buildHotbar() {
  const hotbar = document.createElement('div');
  hotbar.id = 'hotbar';

  inventory.forEach((item, index) => {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';
    slot.dataset.index = String(index);
    slot.textContent = item.name;

    if (index === selectedSlot) {
      slot.classList.add('selected');
    }

    hotbar.appendChild(slot);
  });

  document.body.appendChild(hotbar);
}

function updateHotbar() {
  document.querySelectorAll('.hotbar-slot').forEach((slot, index) => {
    slot.classList.toggle('selected', index === selectedSlot);
  });
}

function addBlock(x, y, z, color = 0x8d6e63) {
  const key = blockKey(x, y, z);
  if (blockMap.has(key)) return;

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color })
  );

  mesh.position.set(x, y, z);
  mesh.userData.blockPos = new THREE.Vector3(x, y, z);
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
  const rough = Math.sin(x * 0.7) + Math.cos(z * 0.9) + Math.sin((x + z) * 0.4);
  const base = Math.floor(3 + rough * 1.5);
  return Math.max(1, base);
}

function generateTerrain() {
  for (let x = -24; x <= 24; x += 1) {
    for (let z = -24; z <= 24; z += 1) {
      const height = terrainHeight(x, z);
      for (let y = 0; y <= height; y += 1) {
        let color = 0x8d6e63;
        if (y === height) color = 0x6bbf59;
        else if (y < height - 1) color = 0x7a7f87;
        addBlock(x, y, z, color);
      }
    }
  }
}

function saveWorld() {
  const blocks = [];
  for (const [key, mesh] of blockMap.entries()) {
    const p = mesh.position;
    blocks.push({ x: p.x, y: p.y, z: p.z, color: mesh.material.color.getHex() });
  }

  localStorage.setItem('minecraft-world', JSON.stringify(blocks));
}

function loadWorld() {
  const raw = localStorage.getItem('minecraft-world');
  if (!raw) return false;

  try {
    const blocks = JSON.parse(raw);
    if (!Array.isArray(blocks) || blocks.length === 0) return false;

    blockMap.forEach((mesh) => world.remove(mesh));
    blockMap.clear();

    blocks.forEach((b) => addBlock(b.x, b.y, b.z, b.color));
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

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(100, 1, 100),
  new THREE.MeshStandardMaterial({ color: 0x4caf50 })
);
ground.position.y = -0.5;
world.add(ground);

function getPlayerBounds(position) {
  return {
    minX: position.x - 0.35,
    maxX: position.x + 0.35,
    minY: position.y,
    maxY: position.y + 1.8,
    minZ: position.z - 0.35,
    maxZ: position.z + 0.35,
  };
}

const player = {
  position: new THREE.Vector3(0, 10, 8),
  velocity: new THREE.Vector3(),
  radius: 0.35,
  height: 1.8,
  speed: 6.5,
  jumpStrength: 7.5,
  gravity: 18,
  onGround: false,
  yaw: 0,
  pitch: 0,
};

const keys = {};

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === 'e') {
    saveWorld();
  }

  if (key === 'r') {
    const worldData = JSON.parse(localStorage.getItem('minecraft-world') || '[]');
    if (worldData.length > 0) loadWorld();
  }

  if (['1', '2', '3', '4'].includes(key)) {
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

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement) return;

  player.yaw -= event.movementX * 0.002;
  player.pitch -= event.movementY * 0.002;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
});

function collidesWithWorld(pos) {
  const bounds = getPlayerBounds(pos);

  for (const mesh of blockMap.values()) {
    const p = mesh.position;
    const minX = p.x - 0.5;
    const maxX = p.x + 0.5;
    const minY = p.y - 0.5;
    const maxY = p.y + 0.5;
    const minZ = p.z - 0.5;
    const maxZ = p.z + 0.5;

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

  if (player.position.y < 2) {
    player.position.y = 2;
    player.velocity.y = 0;
    player.onGround = true;
  }

  camera.position.set(player.position.x, player.position.y + 0.8, player.position.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);

function getTargetBlock() {
  raycaster.setFromCamera(mouse, camera);
  const objects = Array.from(blockMap.values());
  const hits = raycaster.intersectObjects(objects, false);
  if (hits.length === 0) return null;
  return hits[0];
}

function beginMining() {
  const hit = getTargetBlock();
  if (!hit) return;

  hitBlockInfo = hit;
  miningTarget = hit.object;
  miningProgress = 0;
}

function endMining() {
  hitBlockInfo = null;
  miningTarget = null;
  miningProgress = 0;
}

function mineBlock() {
  const hit = getTargetBlock();
  if (!hit) return;

  const p = hit.object.position;
  removeBlock(p.x, p.y, p.z);
  saveWorld();
}

function placeBlock() {
  const hit = getTargetBlock();
  if (!hit) return;

  const normal = hit.face.normal.clone();
  const blockPos = hit.object.position.clone();
  const placementPos = blockPos.add(normal);

  const playerCenter = new THREE.Vector3(player.position.x, player.position.y + 0.9, player.position.z);
  const playerBox = {
    minX: playerCenter.x - 0.4,
    maxX: playerCenter.x + 0.4,
    minY: playerCenter.y - 0.9,
    maxY: playerCenter.y + 0.9,
    minZ: playerCenter.z - 0.4,
    maxZ: playerCenter.z + 0.4,
  };

  const blockBox = {
    minX: placementPos.x - 0.5,
    maxX: placementPos.x + 0.5,
    minY: placementPos.y - 0.5,
    maxY: placementPos.y + 0.5,
    minZ: placementPos.z - 0.5,
    maxZ: placementPos.z + 0.5,
  };

  const overlaps =
    playerBox.minX < blockBox.maxX &&
    playerBox.maxX > blockBox.minX &&
    playerBox.minY < blockBox.maxY &&
    playerBox.maxY > blockBox.minY &&
    playerBox.minZ < blockBox.maxZ &&
    playerBox.maxZ > blockBox.minZ;

  if (!overlaps) {
    const item = inventory[selectedSlot];
    const color = item ? item.color : 0x8d6e63;
    addBlock(Math.round(placementPos.x), Math.round(placementPos.y), Math.round(placementPos.z), color);
    saveWorld();
  }
}

window.addEventListener('mousedown', (event) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  if (event.button === 0) beginMining();
  if (event.button === 2) placeBlock();
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    endMining();
  }
});

function updateMiningState() {
  if (!miningTarget || !hitBlockInfo) return;

  miningProgress += 0.04;

  if (miningProgress >= 1) {
    const p = miningTarget.position;
    removeBlock(p.x, p.y, p.z);
    saveWorld();
    endMining();
  }
}

function updateCrosshair() {
  const crosshair = document.getElementById('crosshair');
  if (!crosshair) return;

  if (hitBlockInfo) {
    crosshair.style.opacity = '1';
    crosshair.style.transform = `scale(${1 + miningProgress * 0.6})`;
  } else {
    crosshair.style.opacity = '0.9';
    crosshair.style.transform = 'scale(1)';
  }
}

function createCrosshair() {
  const crosshair = document.createElement('div');
  crosshair.id = 'crosshair';
  document.body.appendChild(crosshair);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(0.033, clock.getDelta());
  movePlayer(delta);
  updateMiningState();
  updateCrosshair();
  renderer.render(scene, camera);
}

const clock = new THREE.Clock();

buildHotbar();
updateHotbar();
createCrosshair();
ensureWorld();
animate();
