export const enemyModelConfigs = {
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
export const enemyTypes = {
    zealot: { label: "Zealot", hp: 44, speed: 3.7, damage: 13, range: 1.8, color: "bone", attack: "melee" },
    seraphRifle: { label: "Seraph Rifle", hp: 36, speed: 2.8, damage: 10, range: 27, color: "violet", attack: "shoot" },
    womb: { label: "Womb Gate", hp: 75, speed: 1.5, damage: 8, range: 20, color: "poison", attack: "spawn" },
    splitter: { label: "Split Halo", hp: 40, speed: 3.2, damage: 11, range: 2.2, color: "cyan", attack: "split" },
    charger: { label: "Throne Charger", hp: 60, speed: 4.9, damage: 18, range: 3.2, color: "rust", attack: "charge" },
    laserSentry: { label: "Beam Reliquary", hp: 88, speed: 0, damage: 16, range: 38, color: "ember", attack: "laser", stationary: true },
    auraSpire: { label: "Choir Spire", hp: 110, speed: 0, damage: 7, range: 24, color: "poison", attack: "aura", stationary: true },
    skitter: { label: "Skitter", hp: 18, speed: 5.2, damage: 6, range: 1.3, color: "cyan", attack: "melee", minion: true },
};
export const enemyNameParts = {
    prefixes: ["Ash", "Vile", "Grief", "Null", "Rust", "Pale", "Black", "Choir", "Gore", "Hollow", "Iron", "Moon"],
    names: ["Azra", "Malvek", "Iosef", "Seren", "Vath", "Orison", "Khar", "Morrow", "Eidra", "Thorne", "Calix", "Nema"],
    titles: {
        zealot: ["the Penitent", "of the Last Bell", "the Shattered", "of Bone"],
        seraphRifle: ["the Far Choir", "of the Sightline", "the Lancer", "of Glass"],
        womb: ["the Gate-Mother", "of the Breach", "the Swollen", "of the Ninth Door"],
        splitter: ["the Divided", "of the Split Halo", "the Twice-Born", "of Fractures"],
        charger: ["the Crownbreaker", "of the Red Impact", "the Ram", "of Iron Teeth"],
        laserSentry: ["the Watcher", "of the Burning Line", "the Fixed Eye", "of Judgment"],
        auraSpire: ["the Cantor", "of the Green Hymn", "the Choir Nail", "of Rotten Grace"],
        skitter: ["the Small", "of the Underdeck", "the Gnawing", "of Static"],
    },
};
const weaponTemplates = [
    { name: "Reliquary Gunblade", mode: "folded", damage: 30, fireRate: 0.2, reach: 3.7, projectileSpeed: 92, multishot: 1, pierce: 0, orbitals: 0, chain: 0 },
    { name: "Choir Cannon", mode: "rifle", damage: 22, fireRate: 0.14, reach: 2.5, projectileSpeed: 110, multishot: 1, pierce: 1, orbitals: 0, chain: 0 },
    { name: "Mass Driver Sabre", mode: "assault", damage: 42, fireRate: 0.42, reach: 4.8, projectileSpeed: 72, multishot: 2, pierce: 0, orbitals: 0, chain: 0 },
];
export function createWeapons() {
    return weaponTemplates.map((weapon) => ({ ...weapon, upgrades: [] }));
}
export const physics = {
    gravity: 34,
    playerRadius: 0.72,
    playerHeight: 1.1,
    enemyRadius: 0.9,
    enemyHeight: 0.82,
};
export const movementBindings = [
    ["Move Forward", "W"],
    ["Move Back", "S"],
    ["Move Left", "A"],
    ["Move Right", "D"],
    ["Boost", "Tab"],
    ["Quick Boost", "Shift"],
    ["Jump / Ascend", "Space"],
    ["Assault Boost", "Ctrl"],
];
export const combatBindings = [
    ["Left Hand Weapon", "LMB"],
    ["Right Hand Weapon", "RMB"],
    ["Left Shoulder Weapon", "Q"],
    ["Right Shoulder Weapon", "E"],
    ["Shift Control", "R"],
    ["Toggle Lock-On", "T / HUD"],
    ["Auto Lock-On", "Automatic"],
];
export const systemBindings = [
    ["Character Menu", "H / F"],
    ["Control Scheme", "M"],
    ["Close Menu", "Esc"],
    ["Repair Kit", "C"],
    ["Scan", "V"],
    ["Purge Weapon", "P"],
    ["Cycle Weapon", "Arrow Left / Arrow Right"],
    ["Collision Debug View", "F3 / HUD"],
    ["Restart Run", "Backspace"],
    ["Mouse Lock", "Click Canvas"],
];
export const statDescriptions = [
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
