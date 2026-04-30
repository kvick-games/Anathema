import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050607);
scene.fog = new THREE.FogExp2(0x070809, 0.018);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 700);
const clock = new THREE.Clock();

const hud = {
  hp: document.querySelector("#hp"),
  stamina: document.querySelector("#stamina"),
  sanity: document.querySelector("#sanity"),
  goon: document.querySelector("#goon"),
  stats: document.querySelector("#stats"),
  weapon: document.querySelector("#weapon"),
  message: document.querySelector("#message"),
  death: document.querySelector("#death"),
  codex: document.querySelector("#codex"),
  controls: document.querySelector("#controls"),
  closeCodex: document.querySelector("#close-codex"),
  closeControls: document.querySelector("#close-controls"),
  movementBindings: document.querySelector("#movement-bindings"),
  combatBindings: document.querySelector("#combat-bindings"),
  controlsMovement: document.querySelector("#controls-movement"),
  controlsCombat: document.querySelector("#controls-combat"),
  controlsSystem: document.querySelector("#controls-system"),
  statHelp: document.querySelector("#stat-help"),
  characterStats: document.querySelector("#character-stats"),
  equipmentList: document.querySelector("#equipment-list"),
  statusList: document.querySelector("#status-list"),
  upgradeLog: document.querySelector("#upgrade-log"),
  brand: document.querySelector(".brand strong"),
  lockStatus: document.querySelector("#lock-status"),
  enemyIndicators: document.querySelector("#enemy-indicators"),
};

const keys = new Set();
const pointer = { locked: false, yaw: 0, pitch: -0.18 };
const input = { left: false, right: false };
const tmp = new THREE.Vector3();
const lock = { target: null, marker: null };
const gltfLoader = new GLTFLoader();
const enemyModelCache = new Map();

const enemyModelConfigs = {
  zealot: {
    url: "./Artsource/Meshy_AI_Fallen_Reaver_0430014145_texture.glb",
    height: 2.45,
    yaw: Math.PI,
  },
  seraphRifle: {
    url: "./Artsource/Meshy_AI_Cherubim_Lancer_0430014137_texture.glb",
    height: 2.55,
    yaw: Math.PI,
  },
  womb: {
    url: "./Artsource/Meshy_AI_Orphan_of_the_Choir_0430014409_texture.glb",
    height: 3.25,
    yaw: Math.PI,
  },
  splitter: {
    url: "./Artsource/Meshy_AI_Judgment_Bearer_0430014155_texture.glb",
    height: 2.35,
    yaw: Math.PI,
  },
  charger: {
    url: "./Artsource/Meshy_AI_Eye_of_the_Throne_0430014753_texture.glb",
    height: 2.8,
    yaw: Math.PI,
  },
};

const materials = {
  moon: new THREE.MeshStandardMaterial({ color: 0x2a2a29, roughness: 0.96, metalness: 0.04 }),
  ash: new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.9, metalness: 0.1 }),
  hull: new THREE.MeshStandardMaterial({ color: 0x303941, roughness: 0.74, metalness: 0.56 }),
  hullDark: new THREE.MeshStandardMaterial({ color: 0x11171b, roughness: 0.9, metalness: 0.42 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x7b3827, roughness: 0.86, metalness: 0.24 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xb8ac95, roughness: 0.66, metalness: 0.08 }),
  ember: new THREE.MeshStandardMaterial({ color: 0xff6f31, emissive: 0x9d1d0a, emissiveIntensity: 1.2 }),
  violet: new THREE.MeshStandardMaterial({ color: 0x68458f, emissive: 0x271047, emissiveIntensity: 0.8 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x7bd4ff, emissive: 0x0a4d76, emissiveIntensity: 0.85 }),
  poison: new THREE.MeshStandardMaterial({ color: 0x8bff79, emissive: 0x184f12, emissiveIntensity: 0.7 }),
  player: new THREE.MeshStandardMaterial({ color: 0xc7c1ac, roughness: 0.46, metalness: 0.28 }),
  blade: new THREE.MeshStandardMaterial({ color: 0xd9e5e7, roughness: 0.28, metalness: 0.76 }),
  tracer: new THREE.MeshBasicMaterial({ color: 0xffd36a }),
  hostileTracer: new THREE.MeshBasicMaterial({ color: 0xb45cff }),
  lock: new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.82 }),
  laser: new THREE.MeshBasicMaterial({ color: 0xff304f }),
};

const player = {
  group: new THREE.Group(),
  hp: 100,
  stamina: 100,
  sanity: 82,
  goon: 7,
  age: 31,
  decay: 2,
  speed: 11,
  int: 14,
  str: 13,
  grit: 11,
  luck: 9,
  level: 1,
  kills: 0,
  weaponIndex: 0,
  invuln: 0,
  attackCd: 0,
  shotCd: 0,
  shoulderCd: 0,
  repairKits: 2,
  yVelocity: 0,
  grounded: true,
  dead: false,
};

const weapons = [
  { name: "Reliquary Gunblade", mode: "folded", damage: 30, fireRate: 0.2, reach: 3.7, projectileSpeed: 92, multishot: 1, pierce: 0, orbitals: 0, chain: 0, upgrades: [] },
  { name: "Choir Cannon", mode: "rifle", damage: 22, fireRate: 0.14, reach: 2.5, projectileSpeed: 110, multishot: 1, pierce: 1, orbitals: 0, chain: 0, upgrades: [] },
  { name: "Mass Driver Sabre", mode: "assault", damage: 42, fireRate: 0.42, reach: 4.8, projectileSpeed: 72, multishot: 2, pierce: 0, orbitals: 0, chain: 0, upgrades: [] },
];

const enemyTypes = {
  zealot: { label: "Zealot", hp: 44, speed: 3.7, damage: 13, range: 1.8, color: "bone", attack: "melee" },
  seraphRifle: { label: "Seraph Rifle", hp: 36, speed: 2.8, damage: 10, range: 27, color: "violet", attack: "shoot" },
  womb: { label: "Womb Gate", hp: 75, speed: 1.5, damage: 8, range: 20, color: "poison", attack: "spawn" },
  splitter: { label: "Split Halo", hp: 40, speed: 3.2, damage: 11, range: 2.2, color: "cyan", attack: "split" },
  charger: { label: "Throne Charger", hp: 60, speed: 4.9, damage: 18, range: 3.2, color: "rust", attack: "charge" },
  laserSentry: { label: "Beam Reliquary", hp: 88, speed: 0, damage: 16, range: 38, color: "ember", attack: "laser", stationary: true },
  auraSpire: { label: "Choir Spire", hp: 110, speed: 0, damage: 7, range: 24, color: "poison", attack: "aura", stationary: true },
  skitter: { label: "Skitter", hp: 18, speed: 5.2, damage: 6, range: 1.3, color: "cyan", attack: "melee", minion: true },
};

const enemies = [];
const projectiles = [];
const impacts = [];
const levelObjects = [];
const colliders = [];
const floorZones = [];
const spawnPoints = [];
let wave = 1;
let levelSeed = 1;
let portal = null;
let portalActive = false;

const physics = {
  gravity: 34,
  playerRadius: 0.72,
  playerHeight: 1.1,
  enemyRadius: 0.9,
  enemyHeight: 0.82,
};

const movementBindings = [
  ["Move Forward", "W"],
  ["Move Back", "S"],
  ["Move Left", "A"],
  ["Move Right", "D"],
  ["Boost", "Tab"],
  ["Quick Boost", "Shift"],
  ["Jump / Ascend", "Space"],
  ["Assault Boost", "Ctrl"],
];

const combatBindings = [
  ["Left Hand Weapon", "LMB"],
  ["Right Hand Weapon", "RMB"],
  ["Left Shoulder Weapon", "Q"],
  ["Right Shoulder Weapon", "E"],
  ["Shift Control", "R"],
  ["Auto Lock-On", "Automatic"],
];

const systemBindings = [
  ["Character Menu", "H / F"],
  ["Control Scheme", "M"],
  ["Close Menu", "Esc"],
  ["Repair Kit", "C"],
  ["Scan", "V"],
  ["Purge Weapon", "P"],
  ["Cycle Weapon", "Arrow Left / Arrow Right"],
  ["Restart Run", "Backspace"],
  ["Mouse Lock", "Click Canvas"],
];

const statDescriptions = [
  ["Age", "Clone age. Rises between levels and after death; old pilots gain grit but lose clean speed."],
  ["Decay", "Body and suit corrosion. Higher decay drains sanity faster and mutates future upgrades."],
  ["Speed", "Base movement before boost, weapon weight, and decay penalties."],
  ["INT", "Improves projectiles, chain effects, scan quality, and weird weapon functions."],
  ["STR", "Improves melee damage, stagger, assault boost impact, and heavy weapon handling."],
  ["Grit", "Flat damage resistance and repair efficiency."],
  ["Sanity", "Falls around horrors. At zero, the run ends even if HP remains."],
  ["Goon", "Aggression pressure. Builds through violence and fuels some upgrades, but makes enemies bolder."],
  ["Luck", "Raises odds of rare upgrades and chaotic enemy mutations."],
];

function addLights() {
  scene.add(new THREE.HemisphereLight(0x667080, 0x100b08, 0.55));

  const sun = new THREE.DirectionalLight(0xd8e6ff, 2.1);
  sun.position.set(-80, 140, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -130;
  sun.shadow.camera.right = 130;
  sun.shadow.camera.top = 130;
  sun.shadow.camera.bottom = -130;
  scene.add(sun);

  const wound = new THREE.PointLight(0xff4b22, 180, 90, 2);
  wound.position.set(22, 16, -18);
  scene.add(wound);
}

function rand(seed) {
  const x = Math.sin(seed * 999.13) * 43758.5453;
  return x - Math.floor(x);
}

function addLevelObject(object) {
  levelObjects.push(object);
  scene.add(object);
}

function addBoxAsset(x, z, width, depth, height, material, blocks = true, y = height / 2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addLevelObject(mesh);
  if (blocks) colliders.push({ type: "box", x, z, w: width, d: depth });
  return mesh;
}

function addCircleAsset(x, z, radius, height, material, blocks = true) {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), material);
  mesh.position.set(x, height / 2, z);
  mesh.scale.y = Math.max(0.22, height / (radius * 2));
  mesh.rotation.set(rand(levelSeed + x) * 2, rand(levelSeed + z) * 2, rand(levelSeed + x + z) * 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addLevelObject(mesh);
  if (blocks) colliders.push({ type: "circle", x, z, r: radius });
  return mesh;
}

function addFloorZone(zone) {
  floorZones.push(zone);
  return zone;
}

function pointInZone(x, z, zone, margin = 0) {
  if (zone.type === "circle") return Math.hypot(x - zone.x, z - zone.z) <= zone.r + margin;
  return Math.abs(x - zone.x) <= zone.w / 2 + margin && Math.abs(z - zone.z) <= zone.d / 2 + margin;
}

function isOnRoute(x, z, margin = 0) {
  return floorZones.some((zone) => pointInZone(x, z, zone, margin));
}

function terrainHeight(x, z) {
  const route = isOnRoute(x, z, 3);
  if (route) return 0;
  return Math.sin(x * 0.035 + levelSeed) * Math.cos(z * 0.041 - levelSeed) * 0.8 - 0.45;
}

function resolveCircleCollision(position, radius) {
  for (const collider of colliders) {
    if (collider.type === "circle") {
      const dx = position.x - collider.x;
      const dz = position.z - collider.z;
      const minDist = radius + collider.r;
      const distSq = dx * dx + dz * dz;
      if (distSq > 0.0001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const push = (minDist - dist) / dist;
        position.x += dx * push;
        position.z += dz * push;
      }
    } else {
      const closestX = THREE.MathUtils.clamp(position.x, collider.x - collider.w / 2, collider.x + collider.w / 2);
      const closestZ = THREE.MathUtils.clamp(position.z, collider.z - collider.d / 2, collider.z + collider.d / 2);
      const dx = position.x - closestX;
      const dz = position.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        if (distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const push = (radius - dist) / dist;
          position.x += dx * push;
          position.z += dz * push;
        } else {
          const edgeX = collider.w / 2 - Math.abs(position.x - collider.x);
          const edgeZ = collider.d / 2 - Math.abs(position.z - collider.z);
          if (edgeX < edgeZ) position.x += position.x < collider.x ? -(radius + edgeX) : radius + edgeX;
          else position.z += position.z < collider.z ? -(radius + edgeZ) : radius + edgeZ;
        }
      }
    }
  }

  if (!isOnRoute(position.x, position.z, radius * 0.4)) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const zone of floorZones) {
      const clampX = zone.type === "circle" ? zone.x : THREE.MathUtils.clamp(position.x, zone.x - zone.w / 2, zone.x + zone.w / 2);
      const clampZ = zone.type === "circle" ? zone.z : THREE.MathUtils.clamp(position.z, zone.z - zone.d / 2, zone.z + zone.d / 2);
      const dx = position.x - clampX;
      const dz = position.z - clampZ;
      const distance = dx * dx + dz * dz;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { x: clampX, z: clampZ };
      }
    }
    if (nearest) {
      position.x = THREE.MathUtils.lerp(position.x, nearest.x, 0.28);
      position.z = THREE.MathUtils.lerp(position.z, nearest.z, 0.28);
    }
  }

  position.x = THREE.MathUtils.clamp(position.x, -132, 132);
  position.z = THREE.MathUtils.clamp(position.z, -132, 132);
}

function applyGravity(entity, dt, height) {
  entity.yVelocity = (entity.yVelocity ?? 0) - physics.gravity * dt;
  entity.group.position.y += entity.yVelocity * dt;
  const floorY = terrainHeight(entity.group.position.x, entity.group.position.z) + height;
  if (entity.group.position.y <= floorY) {
    entity.group.position.y = floorY;
    entity.yVelocity = 0;
    entity.grounded = true;
  } else {
    entity.grounded = false;
  }
}

function makeRoute() {
  const route = [];
  let x = -46 + rand(levelSeed + 2) * 18;
  let z = 58;
  const count = 5 + Math.min(4, Math.floor(wave / 2));
  for (let i = 0; i < count; i += 1) {
    const exterior = i % 2 === 1;
    const room = {
      type: exterior ? "exterior" : "interior",
      x,
      z,
      w: exterior ? 34 + rand(levelSeed + i) * 18 : 25 + rand(levelSeed + i) * 10,
      d: exterior ? 28 + rand(levelSeed + i + 4) * 16 : 23 + rand(levelSeed + i + 4) * 10,
    };
    route.push(room);
    if (i < count - 1) {
      const nextX = THREE.MathUtils.clamp(x + (rand(levelSeed + i * 9) - 0.5) * 58, -72, 72);
      const nextZ = z - (38 + rand(levelSeed + i * 7) * 22);
      route.push({
        type: "corridor",
        x: (x + nextX) / 2,
        z: (z + nextZ) / 2,
        w: Math.abs(nextX - x) + 12,
        d: Math.abs(nextZ - z) + 12,
      });
      x = nextX;
      z = nextZ;
    }
  }
  return route;
}

function addRoomWalls(zone, wallHeight, material) {
  const gap = Math.min(16, zone.w * 0.45, zone.d * 0.45);
  const sideW = Math.max(3, (zone.w - gap) / 2);
  const sideD = Math.max(3, (zone.d - gap) / 2);
  addBoxAsset(zone.x - gap / 2 - sideW / 2, zone.z - zone.d / 2 - 1.5, sideW, 3, wallHeight, material);
  addBoxAsset(zone.x + gap / 2 + sideW / 2, zone.z - zone.d / 2 - 1.5, sideW, 3, wallHeight, material);
  addBoxAsset(zone.x - gap / 2 - sideW / 2, zone.z + zone.d / 2 + 1.5, sideW, 3, wallHeight, material);
  addBoxAsset(zone.x + gap / 2 + sideW / 2, zone.z + zone.d / 2 + 1.5, sideW, 3, wallHeight, material);
  addBoxAsset(zone.x - zone.w / 2 - 1.5, zone.z - gap / 2 - sideD / 2, 3, sideD, wallHeight, material);
  addBoxAsset(zone.x - zone.w / 2 - 1.5, zone.z + gap / 2 + sideD / 2, 3, sideD, wallHeight, material);
  addBoxAsset(zone.x + zone.w / 2 + 1.5, zone.z - gap / 2 - sideD / 2, 3, sideD, wallHeight, material);
  addBoxAsset(zone.x + zone.w / 2 + 1.5, zone.z + gap / 2 + sideD / 2, 3, sideD, wallHeight, material);
}

function generateLevel() {
  for (const object of levelObjects.splice(0)) scene.remove(object);
  colliders.length = 0;
  floorZones.length = 0;
  spawnPoints.length = 0;
  portal = null;
  portalActive = false;
  levelSeed += 1 + wave * 0.73;
  scene.fog.density = 0.014 + Math.min(0.018, wave * 0.0015);
  hud.brand.textContent = `Deck ${wave - 1}: ${["Impact Scar", "Hangar Basilica", "Reactor Reliquary", "Keel Tomb", "Command Ossuary"][wave % 5]}`;

  const route = makeRoute();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560, 96, 96), materials.moon);
  ground.rotation.x = -Math.PI / 2;
  const pos = ground.geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const routeFloor = route.some((zone) => pointInZone(x, y, zone, 5));
    const ridge = Math.sin(x * (0.045 + rand(levelSeed) * 0.025)) * Math.cos(y * 0.055) * 1.15;
    pos.setZ(i, routeFloor ? 0 : ridge - 0.55 + (rand(levelSeed + i) - 0.5) * 0.8);
  }
  ground.geometry.computeVertexNormals();
  ground.receiveShadow = true;
  addLevelObject(ground);

  for (let i = 0; i < route.length; i += 1) {
    const zone = route[i];
    addFloorZone(zone);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(zone.w, 0.18, zone.d), zone.type === "exterior" ? materials.ash : materials.hullDark);
    floor.position.set(zone.x, 0.02, zone.z);
    floor.receiveShadow = true;
    addLevelObject(floor);

    if (zone.type !== "corridor") {
      spawnPoints.push({ x: zone.x, z: zone.z, room: zone });
      const wallHeight = zone.type === "exterior" ? 2.8 : 7.5;
      const wallMat = zone.type === "exterior" ? materials.rust : materials.hull;
      addRoomWalls(zone, wallHeight, wallMat);
      for (let j = 0; j < 3 + Math.floor(rand(levelSeed + i * 4) * 3); j += 1) {
        const ox = zone.x + (rand(levelSeed + i * 30 + j) - 0.5) * (zone.w - 9);
        const oz = zone.z + (rand(levelSeed + i * 34 + j) - 0.5) * (zone.d - 9);
        if (Math.hypot(ox - zone.x, oz - zone.z) > 5) {
          if (zone.type === "exterior") addCircleAsset(ox, oz, 1.6 + rand(levelSeed + j) * 2.2, 1.2 + rand(levelSeed + j + 2) * 2, materials.ash);
          else addBoxAsset(ox, oz, 2.5 + rand(levelSeed + j) * 5, 2.5 + rand(levelSeed + j + 6) * 5, 2.2 + rand(levelSeed + j + 9) * 4, j % 2 ? materials.hull : materials.rust);
        }
      }
    } else {
      addBoxAsset(zone.x - zone.w / 2 - 1.2, zone.z, 2, zone.d + 2, 3.5, materials.hullDark);
      addBoxAsset(zone.x + zone.w / 2 + 1.2, zone.z, 2, zone.d + 2, 3.5, materials.hullDark);
    }
  }

  const start = spawnPoints[0] ?? { x: 0, z: 20 };
  player.group.position.set(start.x, physics.playerHeight, start.z);
  player.yVelocity = 0;
  player.grounded = true;
}

function makeStars() {
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(Array.from({ length: 1200 }, () => (Math.random() - 0.5) * 900), 3),
    ),
    new THREE.PointsMaterial({ color: 0x9aa1ad, size: 0.85, sizeAttenuation: true }),
  );
  stars.position.y = 170;
  scene.add(stars);
}

function makePlayer() {
  player.group.position.set(0, 1.1, 20);
  scene.add(player.group);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.1, 6, 10), materials.player);
  body.castShadow = true;
  player.group.add(body);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.09), materials.ember);
  visor.position.set(0, 0.5, -0.45);
  player.group.add(visor);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.9), materials.blade);
  blade.name = "blade";
  blade.position.set(0.58, -0.08, -0.58);
  blade.rotation.x = 0.45;
  player.group.add(blade);

  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 1.05), materials.hullDark);
  gun.name = "gun";
  gun.position.set(-0.45, 0.05, -0.56);
  player.group.add(gun);
}

function prepareEnemyModelNode(node) {
  if (!node.isMesh) return;
  node.castShadow = true;
  node.receiveShadow = true;

  const materialsToTune = Array.isArray(node.material) ? node.material : [node.material];
  for (const material of materialsToTune) {
    if (!material) continue;
    if ("roughness" in material) material.roughness = Math.max(material.roughness ?? 0.7, 0.48);
    if ("metalness" in material) material.metalness = Math.min(material.metalness ?? 0.15, 0.45);
  }
}

function loadEnemyModel(config) {
  const cached = enemyModelCache.get(config.url);
  if (cached) return cached;

  const request = gltfLoader.loadAsync(config.url)
    .then((gltf) => {
      const source = gltf.scene ?? gltf.scenes?.[0];
      if (!source) throw new Error(`No scene found in ${config.url}`);
      source.traverse(prepareEnemyModelNode);
      return source;
    })
    .catch((error) => {
      console.warn(`Enemy model failed to load: ${config.url}`, error);
      return null;
    });

  enemyModelCache.set(config.url, request);
  return request;
}

function normalizeEnemyModel(model, targetHeight) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const dominantSize = Math.max(size.x, size.y, size.z, 0.001);
  model.scale.multiplyScalar(targetHeight / dominantSize);

  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
}

function attachEnemyModel(enemy) {
  const config = enemyModelConfigs[enemy.typeName];
  if (!config) return;

  loadEnemyModel(config).then((source) => {
    if (!source || !enemy.group.parent) return;

    const holder = new THREE.Group();
    const model = source.clone(true);
    holder.name = `${enemy.typeName}-mesh`;
    holder.rotation.set(config.pitch ?? 0, config.yaw ?? 0, config.roll ?? 0);
    holder.add(model);
    normalizeEnemyModel(model, config.height + Math.min(0.9, enemy.tier * 0.07));

    enemy.visual.add(holder);
    enemy.model = holder;
    enemy.fallback.visible = false;
  });
}

function preloadEnemyModels() {
  for (const config of Object.values(enemyModelConfigs)) loadEnemyModel(config);
}

function makeProceduralEnemyVisual(typeName, type, tier) {
  const visual = new THREE.Group();
  const mat = materials[type.color] ?? materials.bone;
  const coreSize = type.stationary ? 1.08 : type.minion ? 0.48 : 0.72 + tier * 0.025 + Math.random() * 0.22;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(coreSize, typeName === "womb" || type.stationary ? 2 : 1), mat);
  core.castShadow = true;
  visual.add(core);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14 + Math.random() * 0.08, 12, 8), typeName === "seraphRifle" ? materials.ember : materials.violet);
  eye.position.set(0, 0.12, -0.72);
  visual.add(eye);

  const wingCount = typeName === "womb" || type.stationary ? 10 : type.minion ? 3 : 5 + Math.floor(Math.random() * 5);
  for (let i = 0; i < wingCount; i += 1) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.14 + Math.random() * 0.09, 1.7 + Math.random() * 1.4, 4), i % 2 ? materials.bone : materials.rust);
    const a = (i / wingCount) * Math.PI * 2;
    wing.position.set(Math.cos(a) * 0.72, Math.sin(i) * 0.22, Math.sin(a) * 0.72);
    wing.rotation.set(Math.PI / 2, 0, -a);
    wing.castShadow = true;
    visual.add(wing);
  }

  return visual;
}

function makeEnemy(x, z, typeName = "zealot", tier = wave) {
  const type = enemyTypes[typeName];
  const variance = 0.84 + Math.random() * 0.42;
  const group = new THREE.Group();
  group.position.set(x, terrainHeight(x, z) + physics.enemyHeight, z);
  scene.add(group);

  const visual = new THREE.Group();
  const fallback = makeProceduralEnemyVisual(typeName, type, tier);
  visual.add(fallback);
  group.add(visual);

  const enemy = {
    group,
    visual,
    fallback,
    model: null,
    typeName,
    tier,
    label: type.label,
    hp: (type.hp + tier * 7) * variance,
    maxHp: (type.hp + tier * 7) * variance,
    speed: (type.speed + tier * 0.08) * (0.86 + Math.random() * 0.28),
    damage: (type.damage + tier * 1.25) * variance,
    range: type.range + Math.random() * 4,
    attack: type.attack,
    stationary: type.stationary ?? false,
    minion: type.minion ?? false,
    cooldown: 0.4 + Math.random() * 1.8,
    hitCd: 0,
    spawnCd: 3 + Math.random() * 3,
    laserTick: 0,
    auraFx: 0,
    buffed: 0,
    phase: Math.random() * 10,
    yVelocity: 0,
    grounded: true,
    mutations: randomEnemyMutations(tier),
  };

  enemies.push(enemy);
  attachEnemyModel(enemy);
}

function randomEnemyMutations(tier) {
  const pool = ["barbed", "fast", "rotting", "armored", "frantic", "sanity-leech"];
  const count = Math.min(3, Math.floor(Math.random() * (1 + tier / 3)));
  const picked = [];
  while (picked.length < count) {
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (!picked.includes(next)) picked.push(next);
  }
  return picked;
}

function spawnWave() {
  const types = Object.keys(enemyTypes);
  const count = 5 + Math.floor(wave * 1.8);
  for (let i = 0; i < count; i += 1) {
    const spawn = spawnPoints[1 + (i % Math.max(1, spawnPoints.length - 1))] ?? spawnPoints[0] ?? { x: 0, z: 0, room: { w: 70, d: 70 } };
    const room = spawn.room ?? { w: 70, d: 70 };
    const x = spawn.x + (Math.random() - 0.5) * Math.max(8, room.w - 10);
    const z = spawn.z + (Math.random() - 0.5) * Math.max(8, room.d - 10);
    const unlocked = ["zealot", "splitter", "charger", "seraphRifle", "womb", "laserSentry", "auraSpire"].slice(0, Math.min(7, 2 + Math.floor(wave / 2)));
    const type = i === 0 && wave >= 2 ? "laserSentry" : i === 1 && wave >= 3 ? "auraSpire" : unlocked[Math.floor(Math.random() * unlocked.length)];
    makeEnemy(x, z, type, wave);
  }
  hud.message.textContent = `Deck ${wave}: follow the route through ${spawnPoints.length} rooms and exterior breaches.`;
}

function playerForward() {
  return new THREE.Vector3(-Math.sin(pointer.yaw), 0, -Math.cos(pointer.yaw)).normalize();
}

function weaponAttackRange(weapon = weapons[player.weaponIndex]) {
  if (weapon.mode === "folded") return Math.max(15, weapon.reach + player.str * 0.04 + 1.8);
  return Math.max(15, Math.min(76, weapon.projectileSpeed * 1.25 + weapon.pierce * 7));
}

function targetYaw(position) {
  const dx = position.x - player.group.position.x;
  const dz = position.z - player.group.position.z;
  return Math.atan2(-dx, -dz);
}

function turnToward(current, target, amount) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}

function clearLock() {
  if (lock.marker) {
    scene.remove(lock.marker);
    lock.marker = null;
  }
  lock.target = null;
}

function findLockTarget(range) {
  let best = null;
  let bestDistance = Infinity;
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const distance = enemy.group.position.distanceTo(player.group.position);
    if (distance <= range && distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

function updateLockOn(dt) {
  if (player.dead || !hud.codex.hidden || !hud.controls.hidden) {
    clearLock();
    hud.lockStatus.textContent = player.dead ? "LOCK: offline" : "LOCK: paused";
    hud.lockStatus.classList.remove("locked");
    return;
  }

  const range = weaponAttackRange();
  let currentDistance = lock.target ? lock.target.group.position.distanceTo(player.group.position) : Infinity;
  if (!lock.target || !enemies.includes(lock.target) || lock.target.hp <= 0 || currentDistance > range * 1.12) lock.target = findLockTarget(range);
  currentDistance = lock.target ? lock.target.group.position.distanceTo(player.group.position) : Infinity;

  if (!lock.target) {
    clearLock();
    hud.lockStatus.textContent = `LOCK: searching | ${range.toFixed(0)}m`;
    hud.lockStatus.classList.remove("locked");
    return;
  }

  if (!lock.marker) {
    lock.marker = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.035, 8, 42), materials.lock);
    lock.marker.rotation.x = Math.PI / 2;
    scene.add(lock.marker);
  }

  lock.marker.position.copy(lock.target.group.position).add(new THREE.Vector3(0, 0.18, 0));
  lock.marker.scale.setScalar(1 + Math.sin(performance.now() * 0.009) * 0.08);
  pointer.yaw = turnToward(pointer.yaw, targetYaw(lock.target.group.position), Math.min(1, dt * 9));
  hud.lockStatus.textContent = `LOCK: ${lock.target.label} | ${currentDistance.toFixed(0)}m`;
  hud.lockStatus.classList.add("locked");
}

function lockedDirection() {
  if (!lock.target) return playerForward();
  return lock.target.group.position.clone().add(new THREE.Vector3(0, 0.45, 0)).sub(player.group.position.clone().add(new THREE.Vector3(0, 1.05, 0))).normalize();
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function updateCamera() {
  pointer.pitch = Math.max(-0.78, Math.min(0.22, pointer.pitch));
  const weapon = weapons[player.weaponIndex];
  const aiming = input.right || weapon.mode === "rifle";
  const distance = aiming ? 6.8 : 9.5;
  const height = aiming ? 3.0 : 4.2;
  const dir = new THREE.Vector3(Math.sin(pointer.yaw), 0, Math.cos(pointer.yaw));
  const target = player.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  const camPos = target.clone().addScaledVector(dir, distance).add(new THREE.Vector3(0, height + pointer.pitch * 5, 0));
  camera.position.lerp(camPos, 0.18);
  camera.lookAt(target.x, target.y + 0.25, target.z);
}

function updatePlayer(dt) {
  updateLockOn(dt);
  if (player.dead || !hud.codex.hidden || !hud.controls.hidden) return;

  player.attackCd = Math.max(0, player.attackCd - dt);
  player.shotCd = Math.max(0, player.shotCd - dt);
  player.shoulderCd = Math.max(0, player.shoulderCd - dt);
  player.invuln = Math.max(0, player.invuln - dt);

  const forward = playerForward();
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const move = new THREE.Vector3();
  if (keys.has("KeyW")) move.add(forward);
  if (keys.has("KeyS")) move.sub(forward);
  if (keys.has("KeyD")) move.add(right);
  if (keys.has("KeyA")) move.sub(right);
  if (move.lengthSq() > 0) move.normalize();

  const boost = keys.has("Tab") && player.stamina > 4 && move.lengthSq() > 0;
  const assault = (keys.has("ControlLeft") || keys.has("ControlRight")) && player.stamina > 18;
  const weapon = weapons[player.weaponIndex];
  const speed = player.speed * (boost ? 1.45 : 1) * (assault ? 2.1 : 1) * (weapon.mode === "rifle" ? 0.88 : 1);
  player.group.position.addScaledVector(move.lengthSq() ? move : assault ? forward : tmp.set(0, 0, 0), speed * dt);
  resolveCircleCollision(player.group.position, physics.playerRadius);
  applyGravity(player, dt, physics.playerHeight);
  player.group.rotation.y = pointer.yaw;

  player.stamina += (boost || assault ? -28 : 18) * dt;
  player.stamina = THREE.MathUtils.clamp(player.stamina, 0, 100);
  player.sanity -= (enemies.length * 0.017 + player.decay * 0.004) * dt;
  player.goon += ((input.left || input.right || assault) ? 8 : -2.5) * dt;
  player.goon = THREE.MathUtils.clamp(player.goon, 0, 100);

  const blade = player.group.getObjectByName("blade");
  const gun = player.group.getObjectByName("gun");
  blade.visible = weapon.mode !== "rifle";
  gun.visible = weapon.mode !== "folded";
  blade.scale.z = weapon.reach / 3.7;
  blade.rotation.y = input.left || player.attackCd > 0.35 ? Math.sin(performance.now() * 0.025) * 1.4 : 0;

  if (input.left) leftHand();
  if (input.right) rightHand();
  if (player.hp <= 0 || player.sanity <= 0) die();
}

function quickBoost() {
  if (player.dead || player.stamina < 20 || player.invuln > 0) return;
  player.stamina -= 20;
  player.invuln = 0.38;
  player.group.position.addScaledVector(playerForward(), 6.4);
  hud.message.textContent = "Quick boost. The suit screams, then obeys.";
}

function jumpAscend() {
  if (player.stamina < 12 || !player.grounded) return;
  player.stamina -= 12;
  player.yVelocity = 13.5;
  player.grounded = false;
}

function leftHand() {
  const weapon = weapons[player.weaponIndex];
  if (player.attackCd > 0 || player.stamina < 8) return;
  player.attackCd = weapon.mode === "assault" ? 0.46 : 0.56;
  player.stamina -= 8;
  const reach = weapon.reach + player.str * 0.04;
  const forward = playerForward();
  for (const enemy of enemies) {
    tmp.copy(enemy.group.position).sub(player.group.position);
    if (tmp.length() < reach && tmp.normalize().dot(forward) > 0.25) {
      enemy.hp -= weapon.damage + player.str * 1.7 + player.goon * 0.08;
      if (weapon.chain > 0) chainDamage(enemy, weapon.chain);
      pulse(enemy.group.position, 0xffc87a);
    }
  }
}

function rightHand() {
  const weapon = weapons[player.weaponIndex];
  if (player.shotCd > 0 || player.stamina < 3.5) return;
  player.shotCd = Math.max(0.055, weapon.fireRate - player.int * 0.002);
  player.stamina -= 3.5;
  const origin = player.group.position.clone().add(new THREE.Vector3(0, 1.05, 0));
  const base = lock.target ? lock.target.group.position.clone().add(new THREE.Vector3(0, 0.45, 0)).sub(origin).normalize() : playerForward();
  const shots = weapon.multishot;
  for (let i = 0; i < shots; i += 1) {
    const spread = (i - (shots - 1) / 2) * 0.08;
    const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread).normalize();
    projectiles.push({ owner: "player", pos: origin.clone(), dir, life: 1.25, damage: weapon.damage * 0.72 + player.int * 0.75, speed: weapon.projectileSpeed, pierce: weapon.pierce, radius: 1.25 });
  }
}

function shoulder(side) {
  if (player.shoulderCd > 0 || player.stamina < 18) return;
  player.shoulderCd = 1.1;
  player.stamina -= 18;
  const count = side === "left" ? 7 : 3 + Math.floor(player.int / 8);
  for (let i = 0; i < count; i += 1) {
    const dir = playerForward().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - count / 2) * 0.13);
    projectiles.push({ owner: "player", pos: player.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)), dir, life: 1.0, damage: 14 + player.int, speed: side === "left" ? 72 : 120, pierce: 0, radius: 1.15 });
  }
  hud.message.textContent = side === "left" ? "Left shoulder: flechette psalm." : "Right shoulder: rail hymn.";
}

function chainDamage(source, jumps) {
  const nearby = enemies
    .filter((enemy) => enemy !== source && enemy.group.position.distanceTo(source.group.position) < 9)
    .slice(0, jumps);
  for (const enemy of nearby) {
    enemy.hp -= 12 + player.int * 0.4;
    pulse(enemy.group.position, 0x7bd4ff);
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const p = projectiles[i];
    const start = p.pos.clone();
    p.pos.addScaledVector(p.dir, p.speed * dt);
    p.life -= dt;
    for (const collider of colliders) {
      const blocked = collider.type === "circle"
        ? Math.hypot(p.pos.x - collider.x, p.pos.z - collider.z) < collider.r
        : Math.abs(p.pos.x - collider.x) < collider.w / 2 && Math.abs(p.pos.z - collider.z) < collider.d / 2;
      if (blocked && p.pos.y < 6) p.life = 0;
    }

    const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, start.distanceTo(p.pos)), p.owner === "player" ? materials.tracer : materials.hostileTracer);
    line.position.copy(start).lerp(p.pos, 0.5);
    line.lookAt(p.pos);
    impacts.push({ mesh: line, life: 0.045 });
    scene.add(line);

    if (p.owner === "player") {
      for (const enemy of enemies) {
        if (enemy.group.position.distanceTo(p.pos) < p.radius) {
          enemy.hp -= p.damage;
          p.pierce -= 1;
          pulse(enemy.group.position, 0xffd36a);
          if (p.pierce < 0) p.life = 0;
        }
      }
    } else if (!player.dead && player.invuln <= 0 && player.group.position.distanceTo(p.pos) < p.radius) {
      player.hp -= Math.max(3, p.damage - player.grit * 0.32);
      player.sanity -= p.sanity ?? 3;
      p.life = 0;
      pulse(player.group.position, 0xa23cff);
    }

    if (p.life <= 0) projectiles.splice(i, 1);
  }

  for (let i = impacts.length - 1; i >= 0; i -= 1) {
    impacts[i].life -= dt;
    if (impacts[i].life <= 0) {
      scene.remove(impacts[i].mesh);
      impacts.splice(i, 1);
    }
  }
}

function updateEnemyIndicators() {
  if (!hud.enemyIndicators) return;
  hud.enemyIndicators.innerHTML = enemies.map((enemy) => {
    const pos = enemy.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)).project(camera);
    if (pos.z < -1 || pos.z > 1) return "";
    const x = THREE.MathUtils.clamp((pos.x * 0.5 + 0.5) * window.innerWidth, 14, window.innerWidth - 14);
    const y = THREE.MathUtils.clamp((-pos.y * 0.5 + 0.5) * window.innerHeight, 14, window.innerHeight - 14);
    const distance = enemy.group.position.distanceTo(player.group.position);
    const locked = enemy === lock.target ? " locked" : "";
    const elite = enemy.stationary || enemy.buffed > 0 ? " elite" : "";
    const label = enemy.typeName === "laserSentry" ? "LAS" : enemy.typeName === "auraSpire" ? "AUR" : enemy.minion ? "MIN" : Math.ceil(distance);
    return `<div class="enemy-marker${locked}${elite}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px">${label}</div>`;
  }).join("");
}

function pulse(position, color) {
  const flash = new THREE.PointLight(color, 30, 10, 2);
  flash.position.copy(position).add(new THREE.Vector3(0, 1.2, 0));
  scene.add(flash);
  impacts.push({ mesh: flash, life: 0.08 });
}

function updateEnemies(dt) {
  if (player.dead || !hud.codex.hidden || !hud.controls.hidden) return;

  for (const enemy of enemies) enemy.buffed = 0;
  for (const spire of enemies) {
    if (spire.attack !== "aura") continue;
    for (const enemy of enemies) {
      if (enemy !== spire && enemy.group.position.distanceTo(spire.group.position) < spire.range) enemy.buffed = 1;
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.phase += dt;
    enemy.hitCd = Math.max(0, enemy.hitCd - dt);
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    enemy.spawnCd = Math.max(0, enemy.spawnCd - dt);
    enemy.auraFx = Math.max(0, enemy.auraFx - dt);
    applyGravity(enemy, dt, physics.enemyHeight);

    tmp.copy(player.group.position).sub(enemy.group.position).setY(0);
    const dist = tmp.length();
    const dir = tmp.normalize();
    const speed = enemy.stationary ? 0 : enemy.speed * (enemy.buffed ? 1.28 : 1) * (enemy.mutations.includes("fast") ? 1.35 : 1) * (enemy.mutations.includes("armored") ? 0.82 : 1);

    if (enemy.model) {
      const faceYaw = Math.atan2(-dir.x, -dir.z);
      enemy.group.rotation.y = turnToward(enemy.group.rotation.y, faceYaw, Math.min(1, dt * 7));
      enemy.group.rotation.x = Math.sin(enemy.phase * 3) * 0.045;
      enemy.visual.position.y = Math.sin(enemy.phase * 4) * 0.12;
      enemy.visual.rotation.z = Math.sin(enemy.phase * 2.8) * 0.035;
    } else {
      enemy.group.rotation.y += dt * (enemy.mutations.includes("frantic") ? 3.4 : 1.7);
      enemy.group.rotation.x = Math.sin(enemy.phase * 2) * 0.2;
      enemy.visual.position.y = 0;
    }

    if (enemy.attack === "laser" && dist < enemy.range) {
      enemyLaser(enemy, dt);
    } else if (enemy.attack === "aura") {
      if (enemy.spawnCd <= 0) enemySpawn(enemy, "skitter", 3);
      if (enemy.auraFx <= 0) {
        enemy.auraFx = 0.65;
        pulse(enemy.group.position, 0x8bff79);
      }
    } else if (enemy.attack === "shoot" && dist < enemy.range) {
      enemy.group.position.addScaledVector(dir, -speed * 0.35 * dt);
      if (enemy.cooldown <= 0) enemyShoot(enemy, dir);
    } else if (enemy.attack === "spawn" && dist < enemy.range) {
      enemy.group.position.addScaledVector(dir, speed * 0.25 * dt);
      if (enemy.spawnCd <= 0) enemySpawn(enemy);
    } else if (enemy.attack === "charge" && dist < enemy.range * 4 && enemy.cooldown <= 0) {
      enemy.group.position.addScaledVector(dir, speed * 4.2 * dt);
      if (dist < 2.5) enemyMelee(enemy);
    } else if (dist > enemy.range) {
      enemy.group.position.addScaledVector(dir, speed * dt);
    } else {
      enemyMelee(enemy);
    }
    resolveCircleCollision(enemy.group.position, physics.enemyRadius);
    const px = enemy.group.position.x - player.group.position.x;
    const pz = enemy.group.position.z - player.group.position.z;
    const minPlayerDistance = physics.enemyRadius + physics.playerRadius;
    const playerDistSq = px * px + pz * pz;
    if (playerDistSq > 0.0001 && playerDistSq < minPlayerDistance * minPlayerDistance) {
      const playerDist = Math.sqrt(playerDistSq);
      const push = (minPlayerDistance - playerDist) / playerDist;
      enemy.group.position.x += px * push * 0.6;
      enemy.group.position.z += pz * push * 0.6;
      player.group.position.x -= px * push * 0.2;
      player.group.position.z -= pz * push * 0.2;
      resolveCircleCollision(player.group.position, physics.playerRadius);
    }
    enemy.group.position.y = terrainHeight(enemy.group.position.x, enemy.group.position.z) + physics.enemyHeight;

    if (enemy.hp <= 0) killEnemy(i, enemy);
  }

  if (!player.dead && enemies.length === 0) openPortal();
}

function enemyShoot(enemy, dir) {
  enemy.cooldown = 1.0 + Math.random() * 0.8;
  const count = enemy.mutations.includes("frantic") ? 3 : 1;
  for (let i = 0; i < count; i += 1) {
    projectiles.push({
      owner: "enemy",
      pos: enemy.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
      dir: dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (count - 1) / 2) * 0.16),
      life: 1.8,
      damage: enemy.damage * (enemy.buffed ? 1.25 : 1),
      sanity: enemy.mutations.includes("sanity-leech") ? 7 : 3,
      speed: 34 + wave * 2,
      radius: 1.2,
    });
  }
}

function enemyLaser(enemy, dt) {
  enemy.laserTick = Math.max(0, enemy.laserTick - dt);
  const origin = enemy.group.position.clone().add(new THREE.Vector3(0, 0.75, 0));
  const target = player.group.position.clone().add(new THREE.Vector3(0, 0.9, 0));
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, origin.distanceTo(target)), materials.laser);
  beam.position.copy(origin).lerp(target, 0.5);
  beam.lookAt(target);
  impacts.push({ mesh: beam, life: 0.04 });
  scene.add(beam);
  enemy.group.lookAt(player.group.position.x, enemy.group.position.y, player.group.position.z);
  if (enemy.laserTick <= 0 && player.invuln <= 0) {
    enemy.laserTick = 0.32;
    player.hp -= Math.max(2, enemy.damage * 0.22 - player.grit * 0.08);
    player.sanity -= 0.6;
    pulse(player.group.position, 0xff304f);
  }
}

function enemySpawn(enemy, forcedType = null, amount = 2) {
  enemy.spawnCd = enemy.attack === "aura" ? 4.2 : 5.5;
  const spawnType = forcedType ?? (Math.random() > 0.5 ? "zealot" : "splitter");
  for (let i = 0; i < amount; i += 1) {
    const a = Math.random() * Math.PI * 2;
    makeEnemy(enemy.group.position.x + Math.cos(a) * 4, enemy.group.position.z + Math.sin(a) * 4, spawnType, Math.max(1, wave - 1));
  }
  pulse(enemy.group.position, 0x8bff79);
}

function enemyMelee(enemy) {
  if (enemy.hitCd > 0 || player.invuln > 0) return;
  enemy.hitCd = enemy.attack === "charge" ? 1.1 : 0.82;
  player.hp -= Math.max(4, enemy.damage * (enemy.buffed ? 1.25 : 1) - player.grit * 0.35);
  player.sanity -= enemy.mutations.includes("sanity-leech") ? 8 : 4;
  if (enemy.mutations.includes("barbed")) player.decay += 0.08;
  pulse(player.group.position, 0xa23cff);
}

function killEnemy(index, enemy) {
  scene.remove(enemy.group);
  enemies.splice(index, 1);
  player.kills += 1;
  player.goon = Math.min(100, player.goon + 5);
  player.sanity = Math.min(100, player.sanity + 1.5);
  grantUpgrade(enemy);

  if (enemy.attack === "split" && enemy.maxHp > 28) {
    for (let j = 0; j < 2; j += 1) {
      makeEnemy(enemy.group.position.x + (Math.random() - 0.5) * 5, enemy.group.position.z + (Math.random() - 0.5) * 5, "zealot", Math.max(1, wave - 1));
    }
  }
}

function grantUpgrade(enemy) {
  const weapon = weapons[player.weaponIndex];
  const pool = [
    () => { weapon.damage += 3 + Math.floor(player.str / 7); return `${weapon.name}: damage matrix +${3 + Math.floor(player.str / 7)}`; },
    () => { weapon.fireRate = Math.max(0.055, weapon.fireRate * 0.94); return `${weapon.name}: faster ignition`; },
    () => { weapon.multishot += 1; return `${weapon.name}: extra barrel ghost`; },
    () => { weapon.pierce += 1; return `${weapon.name}: moon-piercing rounds`; },
    () => { weapon.reach += 0.28; return `${weapon.name}: blade extends`; },
    () => { weapon.chain += 1; return `${weapon.name}: chain lightning function`; },
    () => { player.speed += 0.12; return "Pilot: servo speed +0.12"; },
    () => { player.grit += 1; return "Pilot: grit hardens"; },
    () => { player.int += 1; return "Pilot: cognition spike"; },
    () => { player.str += 1; return "Pilot: muscle memory overwrite"; },
  ];
  const text = pool[Math.floor(Math.random() * pool.length)]();
  weapon.upgrades.unshift(text);
  weapon.upgrades = weapon.upgrades.slice(0, 7);
  hud.message.textContent = `Kill ${player.kills}: ${text}. ${enemy.label} stats harvested.`;
}

function nextLevel() {
  clearLock();
  portalActive = false;
  portal = null;
  wave += 1;
  player.level += 1;
  player.age += 1;
  player.decay += 0.55;
  player.speed = Math.max(7.5, player.speed - 0.08);
  player.hp = Math.min(100, player.hp + 20);
  player.repairKits = Math.min(5, player.repairKits + (wave % 2));
  generateLevel();
  projectiles.length = 0;
  spawnWave();
}

function repair() {
  if (player.repairKits <= 0 || player.dead) return;
  player.repairKits -= 1;
  player.hp = Math.min(100, player.hp + 38 + player.grit);
  player.decay = Math.max(0, player.decay - 0.35);
  hud.message.textContent = "Repair kit spent. Your suit remembers being useful.";
}

function scan() {
  const counts = enemies.reduce((acc, enemy) => {
    acc[enemy.label] = (acc[enemy.label] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts).map(([name, count]) => `${count} ${name}`).join(", ") || "no hostiles";
  hud.message.textContent = `Scan: ${summary}. Enemy stats are procedural every spawn.`;
}

function purgeWeapon() {
  const weapon = weapons[player.weaponIndex];
  if (weapon.upgrades.length === 0) return;
  const removed = weapon.upgrades.shift();
  weapon.damage = Math.max(12, weapon.damage - 2);
  player.sanity = Math.min(100, player.sanity + 10);
  hud.message.textContent = `Purged ${removed}. Sanity stabilizes.`;
}

function cycleWeapon(step) {
  player.weaponIndex = (player.weaponIndex + step + weapons.length) % weapons.length;
  hud.message.textContent = `Equipped ${weapons[player.weaponIndex].name}.`;
}

function openPortal() {
  if (portalActive) return;
  portalActive = true;
  const end = spawnPoints[spawnPoints.length - 1] ?? { x: 0, z: -60 };
  const group = new THREE.Group();
  group.position.set(end.x, terrainHeight(end.x, end.z) + 0.15, end.z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.18, 12, 64), materials.cyan);
  ring.rotation.x = Math.PI / 2;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.12, 32), materials.violet);
  core.position.y = 0.03;
  const light = new THREE.PointLight(0x7bd4ff, 90, 24, 2);
  light.position.y = 2.1;
  group.add(ring, core, light);
  portal = group;
  addLevelObject(group);
  hud.message.textContent = "Deck cleared. The breach portal is open at the far end of the route.";
}

function updatePortal(dt) {
  if (!portalActive || !portal) return;
  portal.rotation.y += dt * 1.8;
  portal.children[0].scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.08);
  if (player.group.position.distanceTo(portal.position) < 4.3) nextLevel();
}

function toggleCodex(show = hud.codex.hidden) {
  hud.codex.hidden = !show;
  if (show) hud.controls.hidden = true;
  if (show && document.pointerLockElement) document.exitPointerLock();
  renderCodex();
}

function toggleControls(show = hud.controls.hidden) {
  hud.controls.hidden = !show;
  if (show) hud.codex.hidden = true;
  if (show && document.pointerLockElement) document.exitPointerLock();
  renderControls();
}

function renderControls() {
  hud.controlsMovement.innerHTML = movementBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
  hud.controlsCombat.innerHTML = combatBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
  hud.controlsSystem.innerHTML = systemBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
}

function renderCodex() {
  hud.movementBindings.innerHTML = movementBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
  hud.combatBindings.innerHTML = [...combatBindings, ...systemBindings].map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
  const weapon = weapons[player.weaponIndex];
  const coreStats = [
    ["HP", `${Math.max(0, Math.floor(player.hp))} / 100`],
    ["Stamina", `${Math.floor(player.stamina)} / 100`],
    ["Sanity", `${Math.max(0, Math.floor(player.sanity))} / 100`],
    ["Goon", `${Math.floor(player.goon)} / 100`],
    ["Age", Math.floor(player.age)],
    ["Decay", player.decay.toFixed(1)],
    ["Speed", player.speed.toFixed(1)],
    ["INT", player.int],
    ["STR", player.str],
    ["Grit", player.grit],
    ["Luck", player.luck],
    ["Level", player.level],
    ["Wave", wave],
    ["Kills", player.kills],
    ["Repair Kits", player.repairKits],
    ["Attack Range", `${weaponAttackRange(weapon).toFixed(0)}m`],
  ];
  hud.characterStats.innerHTML = coreStats.map(([name, value]) => `<div><span>${name}</span><b>${value}</b></div>`).join("");
  hud.equipmentList.innerHTML = weapons.map((item, index) => {
    const equipped = index === player.weaponIndex ? "Equipped" : "Stored";
    const upgrades = item.upgrades.length ? `${item.upgrades.length} upgrades` : "no upgrades";
    return `<div><b>${equipped}: ${item.name}</b><span>Mode ${item.mode}; damage ${item.damage.toFixed(1)}; fire ${item.fireRate.toFixed(2)}s; reach ${item.reach.toFixed(1)}m; multishot ${item.multishot}; pierce ${item.pierce}; ${upgrades}</span></div>`;
  }).join("");
  const statusRows = [
    ["Lock-On", lock.target ? `${lock.target.label} at ${lock.target.group.position.distanceTo(player.group.position).toFixed(0)}m` : "Searching for enemies in weapon range"],
    ["Boost", keys.has("Tab") && player.stamina > 4 ? "Active" : "Ready"],
    ["Assault Boost", (keys.has("ControlLeft") || keys.has("ControlRight")) && player.stamina > 18 ? "Active" : "Ready"],
    ["Jump / Ascend", player.grounded ? "Grounded" : "Airborne"],
    ["Invulnerability", player.invuln > 0 ? `${player.invuln.toFixed(1)}s` : "Inactive"],
    ["Left-Hand Cooldown", player.attackCd > 0 ? `${player.attackCd.toFixed(2)}s` : "Ready"],
    ["Right-Hand Cooldown", player.shotCd > 0 ? `${player.shotCd.toFixed(2)}s` : "Ready"],
    ["Shoulder Cooldown", player.shoulderCd > 0 ? `${player.shoulderCd.toFixed(2)}s` : "Ready"],
    ["Enemy Pressure", `${enemies.length} hostiles active`],
  ];
  hud.statusList.innerHTML = statusRows.map(([name, text]) => `<div><b>${name}</b><span>${text}</span></div>`).join("");
  hud.statHelp.innerHTML = statDescriptions.map(([name, text]) => `<div><b>${name}</b><span>${text}</span></div>`).join("");
  const upgrades = weapons.flatMap((weapon) => weapon.upgrades.map((upgrade) => [weapon.name, upgrade]));
  hud.upgradeLog.innerHTML = upgrades.length
    ? upgrades.map(([name, text]) => `<div><b>${name}</b><span>${text}</span></div>`).join("")
    : `<div><b>No upgrades</b><span>Kill enemies to add unlimited randomized weapon and pilot functions.</span></div>`;
}

function updateHud() {
  const weapon = weapons[player.weaponIndex];
  hud.hp.value = Math.max(0, player.hp);
  hud.stamina.value = player.stamina;
  hud.sanity.value = Math.max(0, player.sanity);
  hud.goon.value = player.goon;
  hud.weapon.textContent = `${weapon.name} | ${weapon.mode} | Deck ${wave} | Hostiles ${enemies.length} | ${portalActive ? "Portal open" : "Portal sealed"} | Kits ${player.repairKits}`;
  const statPairs = [
    ["Age", Math.floor(player.age)],
    ["Decay", player.decay.toFixed(1)],
    ["Speed", player.speed.toFixed(1)],
    ["INT", player.int],
    ["STR", player.str],
    ["Grit", player.grit],
    ["Luck", player.luck],
    ["Kills", player.kills],
    ["Sanity", Math.floor(player.sanity)],
    ["Goon", Math.floor(player.goon)],
  ];
  hud.stats.innerHTML = statPairs.map(([k, v]) => `<div>${k}<br><b>${v}</b></div>`).join("");
  if (!hud.codex.hidden) renderCodex();
}

function die() {
  player.dead = true;
  hud.death.hidden = false;
}

function restart() {
  clearLock();
  for (const enemy of enemies.splice(0)) scene.remove(enemy.group);
  for (const item of impacts.splice(0)) scene.remove(item.mesh);
  projectiles.length = 0;
  wave = 1;
  Object.assign(player, {
    hp: 100,
    stamina: 100,
    sanity: 82,
    goon: 7,
    age: player.age + 7,
    decay: player.decay + 3,
    speed: Math.max(8, 11 - player.decay * 0.08),
    int: 14 + Math.floor(Math.random() * 4),
    str: 13 + Math.floor(Math.random() * 4),
    grit: 11 + Math.floor(Math.random() * 3),
    luck: 9 + Math.floor(Math.random() * 4),
    level: 1,
    kills: 0,
    weaponIndex: 0,
    invuln: 0,
    attackCd: 0,
    shotCd: 0,
    shoulderCd: 0,
    repairKits: 2,
    yVelocity: 0,
    grounded: true,
    dead: false,
  });
  for (const weapon of weapons) weapon.upgrades.length = 0;
  hud.death.hidden = true;
  generateLevel();
  spawnWave();
}

function tick() {
  const dt = Math.min(0.033, clock.getDelta());
  updatePlayer(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  updatePortal(dt);
  updateCamera();
  updateEnemyIndicators();
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (["Tab", "Space", "ArrowLeft", "ArrowRight", "Escape"].includes(event.code)) event.preventDefault();
  if (event.code === "Escape") {
    toggleCodex(false);
    toggleControls(false);
    return;
  }
  if (player.dead && event.code === "KeyR") {
    restart();
    return;
  }
  if (!hud.codex.hidden || !hud.controls.hidden) {
    if (event.code === "KeyH" || event.code === "KeyF") toggleCodex();
    if (event.code === "KeyM") toggleControls();
    return;
  }
  keys.add(event.code);
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") quickBoost();
  if (event.code === "Space") jumpAscend();
  if (event.code === "KeyQ") shoulder("left");
  if (event.code === "KeyE") shoulder("right");
  if (event.code === "KeyR") cycleWeapon(1);
  if (event.code === "KeyC") repair();
  if (event.code === "KeyH" || event.code === "KeyF") toggleCodex();
  if (event.code === "KeyM") toggleControls();
  if (event.code === "KeyV") scan();
  if (event.code === "KeyP") purgeWeapon();
  if (event.code === "ArrowLeft") cycleWeapon(-1);
  if (event.code === "ArrowRight") cycleWeapon(1);
  if (event.code === "Backspace") restart();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));

canvas.addEventListener("click", () => {
  if (hud.codex.hidden && hud.controls.hidden) canvas.requestPointerLock();
});
hud.closeCodex.addEventListener("click", () => toggleCodex(false));
hud.closeControls.addEventListener("click", () => toggleControls(false));
document.addEventListener("pointerlockchange", () => {
  pointer.locked = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", (event) => {
  if (!pointer.locked) return;
  pointer.yaw -= event.movementX * 0.0022;
  pointer.pitch += event.movementY * 0.0017;
});
window.addEventListener("mousedown", (event) => {
  if (event.button === 0) input.left = true;
  if (event.button === 2) input.right = true;
});
window.addEventListener("mouseup", (event) => {
  if (event.button === 0) input.left = false;
  if (event.button === 2) input.right = false;
});
window.addEventListener("contextmenu", (event) => event.preventDefault());

addLights();
makeStars();
makePlayer();
preloadEnemyModels();
resize();
generateLevel();
spawnWave();
renderCodex();
renderControls();
tick();
