import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 20, 80);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

// Ground
const ground = new THREE.Mesh(
  new THREE.BoxGeometry(100, 1, 100),
  new THREE.MeshStandardMaterial({ color: 0x4caf50 })
);
ground.position.y = -0.5;
world.add(ground);

// Some sample blocks
const blockMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
const blockPositions = [
  [-4, 0, -2],
  [-3, 0, 0],
  [-2, 0, 2],
  [3, 0, -5],
  [5, 0, 2],
  [0, 1, 4],
  [1, 1, 4],
  [2, 1, 4],
];

for (const [x, y, z] of blockPositions) {
  const block = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), blockMaterial);
  block.position.set(x, y + 0.5, z);
  world.add(block);
}

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

// Player state
const player = {
  position: new THREE.Vector3(0, 1.7, 10),
  yaw: 0,
  pitch: 0,
  speed: 7,
};

const keys = {};

window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start pointer lock when canvas is clicked
renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  // No action needed; pointer lock just gives us mouse movement input
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement) return;

  player.yaw -= event.movementX * 0.002;
  player.pitch -= event.movementY * 0.002;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
});

function updatePlayer(delta) {
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

  const move = new THREE.Vector3();

  if (keys['w']) move.add(forward);
  if (keys['s']) move.sub(forward);
  if (keys['a']) move.sub(right);
  if (keys['d']) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(player.speed * delta);
    player.position.add(move);
  }

  // Keep player above the ground
  player.position.y = 1.7;

  // Keep the player inside a simple bounded area
  player.position.x = THREE.MathUtils.clamp(player.position.x, -25, 25);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -25, 25);

  camera.position.copy(player.position);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(0.033, clock.getDelta());
  updatePlayer(delta);

  renderer.render(scene, camera);
}

const clock = new THREE.Clock();
animate();
