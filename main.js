import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 15, 80);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
document.body.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

const ambient = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(100, 1, 100),
  new THREE.MeshStandardMaterial({ color: 0x4caf50 })
);
ground.position.y = -0.5;
world.add(ground);

const blockMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
const blockMap = new Map();
const blockKey = (x, y, z) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;

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

function setInitialBlocks() {
  for (let x = -3; x <= 3; x += 1) {
    for (let z = -2; z <= 2; z += 1) {
      const height = (Math.abs(x) + Math.abs(z)) % 3 === 0 ? 1 : 0;
      if (height > 0) addBlock(x, 0, z, 0x7cb342);
    }
  }

  addBlock(0, 1, 0, 0x8d6e63);
  addBlock(1, 1, 0, 0x9c6b53);
  addBlock(-1, 1, 0, 0x9c6b53);
  addBlock(0, 2, 0, 0x8d6e63);
  addBlock(0, 1, 1, 0x8d6e63);
  addBlock(2, 0, -1, 0x8d6e63);
  addBlock(3, 0, -1, 0x7b5e57);
  addBlock(4, 0, -1, 0x7b5e57);
}

setInitialBlocks();

const player = {
  position: new THREE.Vector3(0, 1.7, 10),
  velocity: new THREE.Vector3(),
  radius: 0.35,
  height: 1.7,
  speed: 6,
  jumpStrength: 7.5,
  gravity: 18,
  onGround: false,
};

const keys = {};

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if (event.code === 'Space') {
    event.preventDefault();
  }
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

  player.yaw = (player.yaw ?? 0) - event.movementX * 0.002;
  player.pitch = ((player.pitch ?? 0) - event.movementY * 0.002);
  player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
});

window.addEventListener('mousedown', (event) => {
  if (document.pointerLockElement !== renderer.domElement) return;

  if (event.button === 0) {
    mineBlock();
  }
  if (event.button === 2) {
    placeBlock();
  }
});

function getPlayerYaw() {
  return player.yaw ?? 0;
}

function getPlayerPitch() {
  return player.pitch ?? 0;
}

function playerBounds(position) {
  const minX = position.x - player.radius;
  const maxX = position.x + player.radius;
  const minY = position.y;
  const maxY = position.y + player.height;
  const minZ = position.z - player.radius;
  const maxZ = position.z + player.radius;

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

function collidesWithWorld(pos) {
  const bounds = playerBounds(pos);

  for (const [key, mesh] of blockMap.entries()) {
    const blockPos = mesh.position;
    const minX = blockPos.x - 0.5;
    const maxX = blockPos.x + 0.5;
    const minY = blockPos.y - 0.5;
    const maxY = blockPos.y + 0.5;
    const minZ = blockPos.z - 0.5;
    const maxZ = blockPos.z + 0.5;

    const overlaps =
      bounds.minX < maxX &&
      bounds.maxX > minX &&
      bounds.minY < maxY &&
      bounds.maxY > minY &&
      bounds.minZ < maxZ &&
      bounds.maxZ > minZ;

    if (overlaps) return true;
  }

  return false;
}

function movePlayer(delta) {
  const yaw = getPlayerYaw();
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  const movement = new THREE.Vector3();
  if (keys['w']) movement.add(forward);
  if (keys['s']) movement.sub(forward);
  if (keys['a']) movement.sub(right);
  if (keys['d']) movement.add(right);

  if (movement.lengthSq() > 0) {
    movement.normalize().multiplyScalar(player.speed * delta);

    const nextX = player.position.clone();
    nextX.x += movement.x;
    if (!collidesWithWorld(nextX)) player.position.x = nextX.x;

    const nextZ = player.position.clone();
    nextZ.z += movement.z;
    if (!collidesWithWorld(nextZ)) player.position.z = nextZ.z;
  }

  if (keys[' ']) {
    if (player.onGround) {
      player.velocity.y = player.jumpStrength;
      player.onGround = false;
    }
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
      player.position.y = Math.ceil(player.position.y);
    } else {
      player.velocity.y = 0;
    }
  }

  if (player.position.y < 1.7) {
    player.position.y = 1.7;
    player.velocity.y = 0;
    player.onGround = true;
  }

  camera.position.set(player.position.x, player.position.y + 1.2, player.position.z);
  camera.rotation.y = yaw;
  camera.rotation.x = getPlayerPitch();
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);

function mineBlock() {
  raycaster.setFromCamera(mouse, camera);

  const intersections = raycaster.intersectObjects(Array.from(blockMap.values()), false);
  if (intersections.length === 0) return;

  const hit = intersections[0];
  const blockPos = hit.object.position;
  removeBlock(blockPos.x, blockPos.y, blockPos.z);
}

function placeBlock() {
  raycaster.setFromCamera(mouse, camera);

  const intersections = raycaster.intersectObjects(Array.from(blockMap.values()), false);
  if (intersections.length === 0) return;

  const hit = intersections[0];
  const normal = hit.face.normal.clone();
  const blockPos = hit.object.position.clone();
  const placementPos = blockPos.add(normal);

  const playerPos = player.position.clone();
  const playerBox = {
    minX: playerPos.x - player.radius,
    maxX: playerPos.x + player.radius,
    minY: playerPos.y,
    maxY: playerPos.y + player.height,
    minZ: playerPos.z - player.radius,
    maxZ: playerPos.z + player.radius,
  };

  const newBlockMinX = placementPos.x - 0.5;
  const newBlockMaxX = placementPos.x + 0.5;
  const newBlockMinY = placementPos.y - 0.5;
  const newBlockMaxY = placementPos.y + 0.5;
  const newBlockMinZ = placementPos.z - 0.5;
  const newBlockMaxZ = placementPos.z + 0.5;

  const overlapsPlayer =
    playerBox.minX < newBlockMaxX &&
    playerBox.maxX > newBlockMinX &&
    playerBox.minY < newBlockMaxY &&
    playerBox.maxY > newBlockMinY &&
    playerBox.minZ < newBlockMaxZ &&
    playerBox.maxZ > newBlockMinZ;

  if (!overlapsPlayer) {
    addBlock(Math.round(placementPos.x), Math.round(placementPos.y), Math.round(placementPos.z));
  }
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.033);
  movePlayer(delta);
  renderer.render(scene, camera);
}

animate();
