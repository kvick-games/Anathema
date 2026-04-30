import * as THREE from "three";
import { SceneGameObject } from "../core/gameObject.js";
export class EnemyEntity extends SceneGameObject {
    group;
    visual;
    fallback;
    model;
    typeName;
    tier;
    label;
    name;
    displayName;
    hp;
    maxHp;
    speed;
    damage;
    range;
    attack;
    stationary;
    minion;
    cooldown;
    hitCd;
    spawnCd;
    laserTick;
    auraFx;
    buffed;
    phase;
    yVelocity;
    grounded;
    mutations;
    constructor(options) {
        super("enemy", options.group);
        Object.assign(this, options);
        this.group = options.group;
    }
}
export class EnemyFactory {
    entities;
    deps;
    constructor(entities, deps) {
        this.entities = entities;
        this.deps = deps;
    }
    create(x, z, typeName = "zealot", tier = 1) {
        const type = this.deps.enemyTypes[typeName];
        const spawnZone = this.deps.nearestFloorZone(x, z);
        const spawn = this.deps.isSafeSpawnPoint(x, z, this.deps.physics.enemyRadius)
            ? { x, z }
            : this.deps.findSafePoint(spawnZone, this.deps.physics.enemyRadius, { x, z });
        const name = this.deps.makeEnemyName(typeName, spawn.x, spawn.z, tier);
        const variance = 0.84 + Math.random() * 0.42;
        const group = new THREE.Group();
        group.position.set(spawn.x, this.deps.terrainHeight(spawn.x, spawn.z) + this.deps.physics.enemyHeight, spawn.z);
        this.deps.scene.add(group);
        const visual = new THREE.Group();
        const fallback = createProceduralEnemyVisual(this.deps.materials, typeName, type, tier);
        visual.add(fallback);
        group.add(visual);
        const enemy = new EnemyEntity({
            group,
            visual,
            fallback,
            model: null,
            typeName,
            tier,
            label: type.label,
            name,
            displayName: `${name}, ${type.label}`,
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
        });
        this.entities.addEnemy(enemy);
        this.deps.attachEnemyModel(enemy);
        return enemy;
    }
}
export function createProceduralEnemyVisual(materials, typeName, type, tier) {
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
export function randomEnemyMutations(tier) {
    const pool = ["barbed", "fast", "rotting", "armored", "frantic", "sanity-leech"];
    const count = Math.min(3, Math.floor(Math.random() * (1 + tier / 3)));
    const picked = [];
    while (picked.length < count) {
        const next = pool[Math.floor(Math.random() * pool.length)];
        if (!picked.includes(next))
            picked.push(next);
    }
    return picked;
}
