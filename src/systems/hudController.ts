import type { Binding } from "../core/types.js";

interface HudSnapshot {
  player: any;
  weapons: any[];
  enemies: any[];
  wave: number;
  waveHostileCount: number;
  portalActive: boolean;
  input: { left: boolean; right: boolean };
  lock: { target: any; enabled: boolean };
  keys: Set<string>;
  movementBindings: Binding[];
  combatBindings: Binding[];
  systemBindings: Binding[];
  statDescriptions: Binding[];
  weaponAttackRange: (weapon?: any) => number;
}

interface IndicatorSnapshot {
  enemies: any[];
  player: any;
  lockTarget: any;
}

function qs<T extends HTMLElement = HTMLElement>(selector: string): T {
  return document.querySelector(selector) as T;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value: unknown) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char] ?? char);
}

export function createHudController() {
  const elements = {
    meters: {
      hp: qs("#hp"),
      stamina: qs("#stamina"),
      sanity: qs("#sanity"),
      decay: qs("#decay"),
      goon: qs("#goon"),
    },
    meterValues: {
      hp: qs('[data-value="hp"]'),
      stamina: qs('[data-value="stamina"]'),
      sanity: qs('[data-value="sanity"]'),
      decay: qs('[data-value="decay"]'),
      goon: qs('[data-value="goon"]'),
    },
    stats: qs("#stats"),
    weapon: qs("#weapon"),
    weaponAmmo: qs("#weapon-ammo"),
    weaponDetail: qs("#weapon-detail"),
    weaponHeat: qs("#weapon-heat"),
    message: qs("#message"),
    routeProgress: qs("#route-progress"),
    death: qs("#death"),
    codex: qs("#codex"),
    controls: qs("#controls"),
    closeCodex: qs("#close-codex"),
    closeControls: qs("#close-controls"),
    movementBindings: qs("#movement-bindings"),
    combatBindings: qs("#combat-bindings"),
    controlsMovement: qs("#controls-movement"),
    controlsCombat: qs("#controls-combat"),
    controlsSystem: qs("#controls-system"),
    statHelp: qs("#stat-help"),
    characterStats: qs("#character-stats"),
    equipmentList: qs("#equipment-list"),
    statusList: qs("#status-list"),
    upgradeLog: qs("#upgrade-log"),
    deckTitle: qs("#deck-title"),
    lockStatus: qs("#lock-status"),
    lockToggle: qs("#lock-toggle"),
    debugCollisionToggle: qs("#debug-collision-toggle"),
    combatHud: qs("#combat-hud"),
    enemyIndicators: qs("#enemy-indicators"),
    radarBlips: qs("#radar-blips"),
    quickKitCount: qs(".quick-slot.active small"),
  };

  function setBar(element: HTMLElement | null, value: number, max = 100) {
    if (!element) return;
    const pct = max <= 0 ? 0 : clamp((value / max) * 100, 0, 100);
    element.style.setProperty("--value", `${pct.toFixed(1)}%`);
  }

  function setMeter(name: keyof typeof elements.meters, value: number, max = 100, display = `${Math.floor(value)} / ${max}`) {
    setBar(elements.meters[name], value, max);
    elements.meterValues[name].textContent = display;
  }

  function renderControls(bindings: Pick<HudSnapshot, "movementBindings" | "combatBindings" | "systemBindings">) {
    elements.controlsMovement.innerHTML = bindings.movementBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
    elements.controlsCombat.innerHTML = bindings.combatBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
    elements.controlsSystem.innerHTML = bindings.systemBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
  }

  function renderCodex(snapshot: HudSnapshot) {
    const { player, weapons, enemies, wave, lock, keys, movementBindings, combatBindings, systemBindings, statDescriptions, weaponAttackRange } = snapshot;
    elements.movementBindings.innerHTML = movementBindings.map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
    elements.combatBindings.innerHTML = [...combatBindings, ...systemBindings].map(([label, key]) => `<div class="bind-row"><span>${label}</span><span class="keycap">${key}</span></div>`).join("");
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
    elements.characterStats.innerHTML = coreStats.map(([name, value]) => `<div><span>${name}</span><b>${value}</b></div>`).join("");
    elements.equipmentList.innerHTML = weapons.map((item, index) => {
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
    elements.statusList.innerHTML = statusRows.map(([name, text]) => `<div><b>${name}</b><span>${text}</span></div>`).join("");
    elements.statHelp.innerHTML = statDescriptions.map(([name, text]) => `<div><b>${name}</b><span>${text}</span></div>`).join("");
    const upgrades = weapons.flatMap((weapon) => weapon.upgrades.map((upgrade) => [weapon.name, upgrade]));
    elements.upgradeLog.innerHTML = upgrades.length
      ? upgrades.map(([name, text]) => `<div><b>${name}</b><span>${text}</span></div>`).join("")
      : `<div><b>No upgrades</b><span>Kill enemies to add unlimited randomized weapon and pilot functions.</span></div>`;
  }

  function toggleCodex(show = elements.codex.hidden, snapshot?: HudSnapshot) {
    elements.codex.hidden = !show;
    if (show) elements.controls.hidden = true;
    if (show && document.pointerLockElement) document.exitPointerLock();
    if (snapshot) renderCodex(snapshot);
  }

  function toggleControls(show = elements.controls.hidden, bindings?: Pick<HudSnapshot, "movementBindings" | "combatBindings" | "systemBindings">) {
    elements.controls.hidden = !show;
    if (show) elements.codex.hidden = true;
    if (show && document.pointerLockElement) document.exitPointerLock();
    if (bindings) renderControls(bindings);
  }

  function update(snapshot: HudSnapshot) {
    const { player, weapons, enemies, wave, waveHostileCount, portalActive, input, lock } = snapshot;
    const weapon = weapons[player.weaponIndex];
    setMeter("hp", Math.max(0, player.hp), 100, `${Math.max(0, Math.floor(player.hp))} / 100`);
    setMeter("stamina", player.stamina, 100, `${Math.floor(player.stamina)} / 100`);
    setMeter("sanity", Math.max(0, player.sanity), 100, `${Math.max(0, Math.floor(player.sanity))} / 100`);
    setMeter("decay", player.decay, 40, `${player.decay.toFixed(1)}%`);
    setMeter("goon", player.goon, 100, `${Math.floor(player.goon)} / 100`);
    elements.weapon.textContent = weapon.name;
    elements.weaponAmmo.textContent = `${Math.round(weapon.damage)} / ${Math.round(weapon.projectileSpeed)}`;
    elements.weaponDetail.textContent = `${weapon.mode} | Deck ${wave} | Hostiles ${enemies.length}`;
    setBar(elements.weaponHeat, 100 - player.stamina * 0.55 + (input.left || input.right ? 24 : 0), 100);
    const defeated = Math.max(0, waveHostileCount - enemies.length);
    setBar(elements.routeProgress, portalActive ? 100 : defeated, Math.max(1, waveHostileCount));
    elements.quickKitCount.textContent = String(player.repairKits);
    const combatRows: [string, string, number][] = [
      ["LMB", weapon.mode === "rifle" ? "Bayonet" : "Left Weapon", player.attackCd],
      ["RMB", weapon.mode === "folded" ? "Gunblade Fire" : weapon.name, player.shotCd],
      ["Q", "Left Shoulder", player.shoulderCd],
      ["E", "Right Shoulder", player.shoulderCd],
      ["Shift", "Quick Boost", player.invuln],
      ["Space", player.grounded ? "Jump Ready" : "Airborne", player.grounded ? 0 : 1],
      ["T", lock.enabled ? "Lock-On On" : "Lock-On Off", 0],
    ];
    elements.combatHud.innerHTML = combatRows.map(([inputName, label, cd]) => {
      const ready = cd <= 0;
      const value = ready ? "READY" : `${cd.toFixed(1)}s`;
      return `<div class="combat-slot ${ready ? "ready" : "cooling"}"><span class="keycap">${inputName}</span><b>${label}</b><em>${value}</em></div>`;
    }).join("");
    const statPairs: [string, string | number, number][] = [
      ["AGE", Math.floor(player.age), 80],
      ["STR", player.str, 40],
      ["INT", player.int, 40],
      ["SPD", player.speed.toFixed(1), 24],
      ["DECAY", player.decay.toFixed(1), 40],
      ["SANITY", Math.floor(player.sanity), 100],
      ["GOON", Math.floor(player.goon), 100],
    ];
    elements.stats.innerHTML = statPairs.map(([k, v, max]) => {
      const pct = clamp((Number(v) / max) * 100, 0, 100);
      return `<div class="stat-row"><span>${k}</span><span class="stat-pips" style="--value:${pct.toFixed(1)}%"></span><b>${v}</b></div>`;
    }).join("");
    if (!elements.codex.hidden) renderCodex(snapshot);
  }

  function updateRadarBlips({ enemies, player, lockTarget, pointerYaw }: IndicatorSnapshot & { pointerYaw: number }) {
    const center = 105.5;
    const radius = 72;
    const range = 92;
    const sin = Math.sin(pointerYaw);
    const cos = Math.cos(pointerYaw);

    elements.radarBlips.innerHTML = enemies.map((enemy) => {
      const offset = enemy.group.position.clone().sub(player.group.position);
      const localX = offset.x * cos - offset.z * sin;
      const localZ = offset.x * sin + offset.z * cos;
      const distance = Math.hypot(localX, localZ);
      const amount = Math.min(1, distance / range);
      const angle = Math.atan2(localX, localZ);
      const x = center + Math.sin(angle) * radius * amount;
      const y = center - Math.cos(angle) * radius * amount;
      const locked = enemy === lockTarget ? " locked" : "";
      const elite = enemy.stationary || enemy.buffed > 0 ? " elite" : "";
      return `<i class="radar-blip${locked}${elite}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px"></i>`;
    }).join("");
  }

  function updateEnemyIndicators({ enemies, player, lockTarget, pointerYaw, camera }: IndicatorSnapshot & { pointerYaw: number; camera: any }) {
    updateRadarBlips({ enemies, player, lockTarget, pointerYaw });
    elements.enemyIndicators.innerHTML = enemies.map((enemy) => {
      const pos = enemy.group.position.clone();
      pos.y += 1.2;
      pos.project(camera);
      if (pos.z < -1 || pos.z > 1) return "";
      const x = clamp((pos.x * 0.5 + 0.5) * window.innerWidth, 14, window.innerWidth - 14);
      const y = clamp((-pos.y * 0.5 + 0.5) * window.innerHeight, 14, window.innerHeight - 14);
      const distance = enemy.group.position.distanceTo(player.group.position);
      const locked = enemy === lockTarget ? " locked" : "";
      const elite = enemy.stationary || enemy.buffed > 0 ? " elite" : "";
      const shortCode = enemy.typeName === "laserSentry" ? "LAS" : enemy.typeName === "auraSpire" ? "AUR" : enemy.minion ? "MIN" : Math.ceil(distance);
      const label = locked || elite ? enemy.name.split(" ")[1] : shortCode;
      const hp = clamp((enemy.hp / enemy.maxHp) * 100, 0, 100);
      return `<div class="enemy-marker${locked}${elite}" title="${escapeHtml(enemy.displayName)}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px"><span>${escapeHtml(label)}</span><i><b style="width:${hp.toFixed(1)}%"></b></i></div>`;
    }).join("");
  }

  return {
    ...elements,
    setBar,
    setMeter,
    renderControls,
    renderCodex,
    toggleCodex,
    toggleControls,
    update,
    updateRadarBlips,
    updateEnemyIndicators,
  };
}
