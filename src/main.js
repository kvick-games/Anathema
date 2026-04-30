import * as THREE from "three";

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
  closeCodex: document.querySelector("#close-codex"),
  movementBindings: document.querySelector("#movement-bindings"),
  combatBindings: document.querySelector("#combat-bindings"),
  statHelp: document.querySelector("#stat-help"),
  characterStats: document.querySelector("#character-stats"),
  equipmentList: document.querySelector("#equipment-list"),
  statusList: document.querySelector("#status-list"),
  upgradeLog: document.querySelector("#upgrade-log"),
  brand: document.querySelector(".brand strong"),
  lockStatus: document.querySelector("#lock-status"),
};

const keys = new Set();
const pointer = { locked: false, yaw: 0, pitch: -0.18 };
const input = { left: false, right: false };
const tmp = new THREE.Vector3();
const lock = { target: null, marker: null };

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
  jump: 0,
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
};

const enemies = [];
const projectiles = [];
const impacts = [];
const levelObjects = [];
let wave = 1;
let levelSeed = 1;

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
  ["Repair Kit", "C"],
  ["Character Menu", "H / F"],
  ["Auto Lock-On", "Automatic"],
  ["Scan", "V"],
  ["Purge Weapon", "P"],
  ["Option Left / Right", "← / →"],
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

function generateLevel() {
  for (const object of levelObjects.splice(0)) scene.remove(object);
  levelSeed += 1 + wave * 0.73;
  scene.fog.density = 0.014 + Math.min(0.018, wave * 0.0015);
  hud.brand.textContent = `Deck ${wave - 1}: ${["Impact Scar", "Hangar Basilica", "Reactor Reliquary", "Keel Tomb", "Command Ossuary"][wave % 5]}`;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560, 96, 96), materials.moon);
  ground.rotation.x = -Math.PI / 2;
  const pos = ground.geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const ridge = Math.sin(x * (0.05 + rand(levelSeed) * 0.05)) * Math.cos(y * 0.07) * 1.9;
    const crater = -8 * Math.exp(-((x - 20 * rand(levelSeed + 4)) ** 2 + (y + 30 * rand(levelSeed + 7)) ** 2) / (1200 + wave * 40));
    pos.setZ(i, ridge + crater + (rand(levelSeed + i) - 0.5) * 1.4);
  }
  ground.geometry.computeVertexNormals();
  ground.receiveShadow = true;
  addLevelObject(ground);

  const hull = new THREE.Group();
  hull.rotation.set(-0.03 * wave, 0.22 + rand(levelSeed + 2) * 0.5, -0.18);
  hull.position.set(8 + rand(levelSeed + 9) * 24, 7, -22 - rand(levelSeed + 8) * 16);
  addLevelObject(hull);

  const shipCore = new THREE.Mesh(new THREE.BoxGeometry(104 + wave * 4, 18, 32), materials.hull);
  shipCore.castShadow = true;
  shipCore.receiveShadow = true;
  hull.add(shipCore);

  for (let i = 0; i < 10 + wave; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(4, 26 + rand(levelSeed + i) * 28, 40), i % 2 ? materials.hullDark : materials.rust);
    rib.position.set(-52 + i * 10, 0, (rand(levelSeed + i * 3) - 0.5) * 11);
    rib.rotation.x = (rand(levelSeed + i * 7) - 0.5) * 0.72;
    rib.castShadow = true;
    hull.add(rib);
  }

  for (let i = 0; i < 36 + wave * 3; i += 1) {
    const chunk = new THREE.Mesh(new THREE.BoxGeometry(4 + rand(levelSeed + i) * 12, 1 + rand(levelSeed + i + 2) * 5, 3 + rand(levelSeed + i + 3) * 14), rand(levelSeed + i + 4) > 0.35 ? materials.hullDark : materials.rust);
    chunk.position.set((rand(levelSeed + i * 11) - 0.5) * 170, 1.5, (rand(levelSeed + i * 13) - 0.5) * 150);
    chunk.rotation.set(rand(levelSeed + i) * 2, rand(levelSeed + i + 1) * 2, rand(levelSeed + i + 2) * 2);
    chunk.castShadow = true;
    chunk.receiveShadow = true;
    addLevelObject(chunk);
  }

  for (let i = 0; i < 52; i += 1) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 + rand(levelSeed + i) * 3.8, 0), materials.ash);
    rock.position.set((rand(levelSeed + i * 5) - 0.5) * 210, 0.8, (rand(levelSeed + i * 6) - 0.5) * 210);
    rock.scale.y = 0.25 + rand(levelSeed + i * 8) * 0.7;
    rock.rotation.set(rand(levelSeed + i), rand(levelSeed + i + 1), rand(levelSeed + i + 2));
    rock.castShadow = true;
    rock.receiveShadow = true;
    addLevelObject(rock);
  }
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

function makeEnemy(x, z, typeName = "zealot", tier = wave) {
  const type = enemyTypes[typeName];
  const variance = 0.84 + Math.random() * 0.42;
  const group = new THREE.Group();
  group.position.set(x, 1.25, z);
  scene.add(group);

  const mat = materials[type.color] ?? materials.bone;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72 + tier * 0.025 + Math.random() * 0.22, typeName === "womb" ? 2 : 1), mat);
  core.castShadow = true;
  group.add(core);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14 + Math.random() * 0.08, 12, 8), typeName === "seraphRifle" ? materials.ember : materials.violet);
  eye.position.set(0, 0.12, -0.72);
  group.add(eye);

  const wingCount = typeName === "womb" ? 10 : 5 + Math.floor(Math.random() * 5);
  for (let i = 0; i < wingCount; i += 1) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.14 + Math.random() * 0.09, 1.7 + Math.random() * 1.4, 4), i % 2 ? materials.bone : materials.rust);
    const a = (i / wingCount) * Math.PI * 2;
    wing.position.set(Math.cos(a) * 0.72, Math.sin(i) * 0.22, Math.sin(a) * 0.72);
    wing.rotation.set(Math.PI / 2, 0, -a);
    wing.castShadow = true;
    group.add(wing);
  }

  enemies.push({
    group,
    typeName,
    label: type.label,
    hp: (type.hp + tier * 7) * variance,
    maxHp: (type.hp + tier * 7) * variance,
    speed: (type.speed + tier * 0.08) * (0.86 + Math.random() * 0.28),
    damage: (type.damage + tier * 1.25) * variance,
    range: type.range + Math.random() * 4,
    attack: type.attack,
    cooldown: 0.4 + Math.random() * 1.8,
    hitCd: 0,
    spawnCd: 3 + Math.random() * 3,
    phase: Math.random() * 10,
    mutations: randomEnemyMutations(tier),
  });
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
    const a = Math.random() * Math.PI * 2;
    const r = 36 + Math.random() * 42;
    const unlocked = types.slice(0, Math.min(types.length, 1 + Math.floor(wave / 2)));
    const type = i === 0 && wave >= 2 ? "seraphRifle" : i === 1 && wave >= 3 ? "womb" : unlocked[Math.floor(Math.random() * unlocked.length)];
    makeEnemy(Math.cos(a) * r, Math.sin(a) * r, type, wave);
  }
  hud.message.textContent = `Wave ${wave}: ${count} procedurally mutating hostiles breach the crater.`;
}

function playerForward() {
  return new THREE.Vector3(-Math.sin(pointer.yaw), 0, -Math.cos(pointer.yaw)).normalize();
}

function weaponAttackRange(weapon = weapons[player.weaponIndex]) {
  if (weapon.mode === "folded") return weapon.reach + player.str * 0.04 + 1.8;
  return Math.min(76, weapon.projectileSpeed * 1.25 + weapon.pierce * 7);
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
  if (player.dead || !hud.codex.hidden) {
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
  return lock.target.group.position.clone().sub(player.group.position).setY(0).normalize();
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
  if (player.dead || !hud.codex.hidden) return;

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
  player.group.position.x = THREE.MathUtils.clamp(player.group.position.x, -125, 125);
  player.group.position.z = THREE.MathUtils.clamp(player.group.position.z, -125, 125);
  player.group.rotation.y = pointer.yaw;

  player.jump = Math.max(0, player.jump - dt * 6);
  player.group.position.y = 1.1 + Math.sin(player.jump) * 1.1;

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
  if (player.stamina < 12 || player.jump > 0.1) return;
  player.stamina -= 12;
  player.jump = Math.PI;
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
  const base = lockedDirection();
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

function pulse(position, color) {
  const flash = new THREE.PointLight(color, 30, 10, 2);
  flash.position.copy(position).add(new THREE.Vector3(0, 1.2, 0));
  scene.add(flash);
  impacts.push({ mesh: flash, life: 0.08 });
}

function updateEnemies(dt) {
  if (player.dead || !hud.codex.hidden) return;

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.phase += dt;
    enemy.hitCd = Math.max(0, enemy.hitCd - dt);
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    enemy.spawnCd = Math.max(0, enemy.spawnCd - dt);
    enemy.group.position.y = 1.15 + Math.sin(enemy.phase * 4) * 0.22;
    enemy.group.rotation.y += dt * (enemy.mutations.includes("frantic") ? 3.4 : 1.7);
    enemy.group.rotation.x = Math.sin(enemy.phase * 2) * 0.2;

    tmp.copy(player.group.position).sub(enemy.group.position);
    const dist = tmp.length();
    const dir = tmp.normalize();
    const speed = enemy.speed * (enemy.mutations.includes("fast") ? 1.35 : 1) * (enemy.mutations.includes("armored") ? 0.82 : 1);

    if (enemy.attack === "shoot" && dist < enemy.range) {
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

    if (enemy.hp <= 0) killEnemy(i, enemy);
  }

  if (!player.dead && enemies.length === 0) nextLevel();
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
      damage: enemy.damage,
      sanity: enemy.mutations.includes("sanity-leech") ? 7 : 3,
      speed: 34 + wave * 2,
      radius: 1.2,
    });
  }
}

function enemySpawn(enemy) {
  enemy.spawnCd = 5.5;
  const spawnType = Math.random() > 0.5 ? "zealot" : "splitter";
  for (let i = 0; i < 2; i += 1) {
    const a = Math.random() * Math.PI * 2;
    makeEnemy(enemy.group.position.x + Math.cos(a) * 4, enemy.group.position.z + Math.sin(a) * 4, spawnType, Math.max(1, wave - 1));
  }
  pulse(enemy.group.position, 0x8bff79);
}

function enemyMelee(enemy) {
  if (enemy.hitCd > 0 || player.invuln > 0) return;
  enemy.hitCd = enemy.attack === "charge" ? 1.1 : 0.82;
  player.hp -= Math.max(4, enemy.damage - player.grit * 0.35);
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
  wave += 1;
  player.level += 1;
  player.age += 1;
  player.decay += 0.55;
  player.speed = Math.max(7.5, player.speed - 0.08);
  player.hp = Math.min(100, player.hp + 20);
  player.repairKits = Math.min(5, player.repairKits + (wave % 2));
  generateLevel();
  player.group.position.set(0, 1.1, 22);
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

function toggleCodex(show = hud.codex.hidden) {
  hud.codex.hidden = !show;
  if (show && document.pointerLockElement) document.exitPointerLock();
  renderCodex();
}

function renderCodex() {
  hud.movementBindings.innerHTML = movementBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
  hud.combatBindings.innerHTML = combatBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
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
    ["Jump / Ascend", player.jump > 0.1 ? "Airborne" : "Grounded"],
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
  hud.weapon.textContent = `${weapon.name} | ${weapon.mode} | Wave ${wave} | Hostiles ${enemies.length} | Kits ${player.repairKits}`;
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
    jump: 0,
    dead: false,
  });
  for (const weapon of weapons) weapon.upgrades.length = 0;
  hud.death.hidden = true;
  generateLevel();
  player.group.position.set(0, 1.1, 20);
  spawnWave();
}

function tick() {
  const dt = Math.min(0.033, clock.getDelta());
  updatePlayer(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  updateCamera();
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (["Tab", "Space", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
  if (player.dead && event.code === "KeyR") {
    restart();
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
  if (event.code === "KeyV") scan();
  if (event.code === "KeyP") purgeWeapon();
  if (event.code === "ArrowLeft") cycleWeapon(-1);
  if (event.code === "ArrowRight") cycleWeapon(1);
  if (event.code === "Backspace") restart();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));

canvas.addEventListener("click", () => {
  if (hud.codex.hidden) canvas.requestPointerLock();
});
hud.closeCodex.addEventListener("click", () => toggleCodex(false));
document.addEventListener("pointerlockchange", () => {
  pointer.locked = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", (event) => {
  if (!pointer.locked) return;
  pointer.yaw -= event.movementX * 0.0022;
  pointer.pitch -= event.movementY * 0.0017;
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
resize();
generateLevel();
spawnWave();
renderCodex();
tick();
