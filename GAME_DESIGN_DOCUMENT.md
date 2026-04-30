# Moon Grave: Battleship Roguelike

## Game Design Document

Version: Current implementation snapshot  
Source reviewed: `index.html`, `styles.css`, `src/main.js`, `Artsource/*.glb`  
Format: Browser-based 3D action roguelike prototype using Three.js

---

## 1. High Concept

Moon Grave is a third-person 3D action roguelike set across procedurally chained decks of a ruined lunar battleship. The player pilots an aging clone in a heavy combat suit, fighting through rooms, corridors, and exterior breaches while managing HP, stamina, sanity, decay, aggression pressure, randomized enemy threats, and weapon mutations.

The current game emphasizes fast movement, lock-on combat, close and ranged hybrid weapons, escalating waves, procedural deck routes, and a run structure where each cleared deck opens a breach portal to the next.

## 2. Current Player Fantasy

The player is a cursed armored survivor pushing through a moon-buried warship. Their suit is powerful but unstable: it boosts, jumps, fires heavy weapons, and absorbs enemy stats, while age and decay slowly compromise the body across the run.

Core fantasy pillars:

- Heavy third-person gunblade combat.
- Roguelike escalation through enemy waves and deck transitions.
- Procedural battleship spaces with route-based traversal.
- Body/suit degradation expressed through age, decay, sanity, and repair.
- Weird sacred-machine enemy identities backed by GLB models and procedural fallback visuals.

## 3. Target Experience

Moment to moment, the player should be:

- Reading the route through hostile rooms and corridors.
- Locking onto high-priority enemies.
- Alternating melee, gunfire, shoulder weapons, boosts, and repair decisions.
- Watching stamina, sanity, and HP meters while pressure rises.
- Harvesting upgrades from kills.
- Clearing all hostiles to open the breach portal.
- Entering the portal to advance to a harder deck.

## 4. Core Gameplay Loop

1. Spawn at the first room of the current deck.
2. Move through the generated route of rooms, corridors, and exterior breach spaces.
3. Fight a wave of enemies spawned across route rooms.
4. Gain randomized weapon or pilot upgrades from kills.
5. Manage HP, stamina, sanity, repair kits, decay, and goon.
6. When all enemies are killed, the breach portal opens at the far end of the route.
7. Enter the portal to advance to the next deck.
8. The next deck increases wave count, enemy variety, fog density, age, decay, and resource pressure.
9. Death or sanity collapse ends the current life; restart ages and decays the clone further while resetting the run.

## 5. Game State

### Persistent Runtime State

The prototype currently tracks:

- `wave`: Current deck/wave difficulty, starts at 1.
- `levelSeed`: Procedural seed used for route and terrain variation.
- `portalActive`: Whether the deck-clear portal is open.
- `enemies`: Active enemy list.
- `projectiles`: Active player and enemy shots.
- `impacts`: Short-lived visual effects and tracer meshes.
- `levelObjects`: Generated world geometry.
- `colliders`: Static collision shapes for walls, obstacles, rocks, and route blocking.
- `floorZones`: Navigable route zones.
- `spawnPoints`: Room-centered spawn anchors.
- `debugCollision`: Collision visualization state.

### Failure State

The player dies when HP reaches zero or sanity reaches zero. The death overlay appears with restart instructions. Restart creates a degraded clone, resets active combat, clears upgrades, and regenerates the first deck.

## 6. Player Character

### Starting Stats

| Stat | Starting Value | Current Function |
| --- | ---: | --- |
| HP | 100 | Health pool. Reaching 0 causes death. |
| Stamina | 100 | Fuels boost, quick boost, jump, attacks, and shoulder weapons. |
| Sanity | 82 | Drains near enemies and from attacks. Reaching 0 causes death. |
| Goon | 7 | Aggression pressure. Rises through attacks and violence, lowers when idle. Adds melee damage. |
| Age | 31 | Clone age. Increases between levels and after restart. |
| Decay | 2 | Body/suit corrosion. Drains sanity over time and worsens after progression/restart. |
| Speed | 11 | Base movement speed before modifiers. |
| INT | 14 | Improves projectile damage, fire cooldown, chain damage, and right shoulder shot count. |
| STR | 13 | Improves melee damage and melee reach. |
| Grit | 11 | Reduces incoming damage and improves repair kit healing. |
| Luck | 9 | Described as rare upgrade and mutation influence, not yet directly used in the upgrade roll. |
| Repair Kits | 2 | Consumable healing resource. |

### Derived Combat Effects

- Melee damage: weapon damage plus STR scaling plus goon scaling.
- Projectile damage: weapon damage percentage plus INT scaling.
- Projectile cooldown: weapon fire rate reduced by INT.
- Incoming damage: reduced by grit, with separate formulas for melee, projectile, and laser damage.
- Sanity loss: drains over time based on active enemy count and decay.

## 7. Movement System

### Navigation

Movement is camera-relative and uses the pointer yaw as the forward basis.

Controls:

| Action | Input |
| --- | --- |
| Move forward | W |
| Move back | S |
| Strafe left | A |
| Strafe right | D |
| Boost | Tab |
| Quick boost | Shift |
| Jump / ascend | Space |
| Assault boost | Ctrl |

### Movement Rules

- Base movement speed uses `player.speed`.
- Boost applies a 1.45x speed multiplier while movement input is active.
- Assault boost applies a 2.1x speed multiplier and can move the player forward without normal movement input.
- Rifle mode applies a 0.88x movement multiplier.
- Stamina drains while boost or assault boost is active.
- Stamina regenerates when not boosting or assault boosting.
- Movement is collision-resolved against static colliders.
- Player position is clamped inside a world boundary of -132 to 132 on X/Z.

### Quick Boost

Quick boost is an instant forward dash.

- Input: Shift.
- Cost: 20 stamina.
- Grants 0.38 seconds of invulnerability.
- Moves the player 6.4 units forward instantly.
- Cannot trigger while dead, out of stamina, or already invulnerable.

### Jump / Ascend

Jump is a ground-only vertical impulse.

- Input: Space.
- Cost: 12 stamina.
- Requires the player to be grounded.
- Applies upward velocity of 13.5.

### Gravity

Gravity is applied to player and enemy entities.

- Gravity value: 34.
- Terrain height is procedural outside the route and flat on route zones.
- Entity y-position snaps to terrain height plus entity standing height when grounded.

## 8. Camera and Pointer System

The camera is third-person and follows the player with smooth interpolation.

- Pointer lock is requested by clicking the canvas.
- Mouse movement changes yaw and pitch.
- Pitch is clamped from -0.78 to 0.22.
- Default camera distance is 9.5 with height 4.2.
- Aiming camera distance is 6.8 with height 3.0.
- Aiming is active when RMB is held or the current weapon mode is rifle.

## 9. Lock-On System

Lock-on is enabled by default and can be toggled.

Controls:

| Action | Input |
| --- | --- |
| Toggle lock-on | T or HUD button |
| Auto lock | Automatic when enabled |

Rules:

- Lock-on chooses the nearest living enemy within weapon attack range.
- If current target dies, disappears, or moves beyond 112 percent of range, a new target is selected.
- When locked, the player's pointer yaw turns toward the target.
- A torus marker is displayed around the locked target.
- The HUD displays lock state, target name, and distance.
- Lock-on pauses while the character menu or controls menu is open.

Weapon attack range:

- Folded mode: at least 15m, based on melee reach plus STR.
- Other modes: at least 15m and up to 76m, based on projectile speed and pierce.

## 10. Combat System

### Inputs

| Action | Input |
| --- | --- |
| Left hand weapon | LMB |
| Right hand weapon | RMB |
| Left shoulder weapon | Q |
| Right shoulder weapon | E |
| Cycle weapon | R, Arrow Left, Arrow Right |
| Repair kit | C |
| Scan | V |
| Purge weapon | P |

### Left Hand Attack

The left hand performs a melee-style attack.

- Cost: 8 stamina.
- Cooldown: 0.56s, or 0.46s in assault weapon mode.
- Hits enemies within weapon reach plus STR scaling.
- Requires the target to be roughly in front of the player.
- Damage: weapon damage + STR scaling + goon scaling.
- Chain upgrades trigger secondary damage to nearby enemies.

### Right Hand Attack

The right hand fires projectiles.

- Cost: 3.5 stamina.
- Cooldown: current weapon fire rate reduced slightly by INT, minimum 0.055s.
- Fires from player chest height.
- Uses locked target direction if a target exists; otherwise fires forward.
- Multishot creates angled spread shots.
- Projectile damage uses weapon damage and INT scaling.
- Projectile pierce allows hits before expiration.

### Shoulder Weapons

Shoulder weapons are burst projectile attacks.

- Shared cooldown: 1.1s.
- Cost: 18 stamina.
- Left shoulder: 7 flechette-style shots at speed 72.
- Right shoulder: 3 plus INT-scaled shots at speed 120.
- Damage: 14 + INT per projectile.

### Projectiles

Projectiles can belong to the player or enemies.

- They move each frame by direction, speed, and delta time.
- They leave short-lived tracer geometry.
- They expire by life timer, collision, or pierce exhaustion.
- Static colliders block projectiles below a y-threshold of 6.
- Player projectiles damage enemies within projectile radius.
- Enemy projectiles damage the player unless invulnerable.

### Chain Damage

Chain damage is unlocked through upgrades.

- Triggered by left hand hits when weapon chain value is above zero.
- Hits nearby enemies within 9 units of the source.
- Number of chained enemies equals chain count.
- Damage is 12 plus INT scaling.

## 11. Weapon System

The player has three current weapons and can cycle between them.

| Weapon | Mode | Damage | Fire Rate | Reach | Projectile Speed | Multishot | Pierce |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Reliquary Gunblade | folded | 30 | 0.20 | 3.7 | 92 | 1 | 0 |
| Choir Cannon | rifle | 22 | 0.14 | 2.5 | 110 | 1 | 1 |
| Mass Driver Sabre | assault | 42 | 0.42 | 4.8 | 72 | 2 | 0 |

### Weapon Presentation

- The player model has a blade and gun mesh.
- Blade is hidden in rifle mode.
- Gun is hidden in folded mode.
- Blade scale reflects the current weapon reach.
- Weapon HUD displays equipped weapon, mode, deck, hostile count, portal state, and repair kits.

## 12. Upgrade System

Every enemy kill grants one randomized upgrade to the currently equipped weapon or pilot.

Current upgrade pool:

| Upgrade | Effect |
| --- | --- |
| Damage matrix | Increases weapon damage by 3 plus STR-derived bonus. |
| Faster ignition | Multiplies weapon fire rate by 0.94, down to minimum behavior limits. |
| Extra barrel ghost | Increases multishot by 1. |
| Moon-piercing rounds | Increases pierce by 1. |
| Blade extends | Increases reach by 0.28. |
| Chain lightning function | Increases chain count by 1. |
| Servo speed | Increases player speed by 0.12. |
| Grit hardens | Increases grit by 1. |
| Cognition spike | Increases INT by 1. |
| Muscle memory overwrite | Increases STR by 1. |

Rules:

- Upgrades are unshifted into the active weapon's upgrade log.
- Only the seven most recent upgrades are displayed per weapon.
- Weapon upgrades persist through deck transitions.
- Restart clears all weapon upgrades.

### Purge Weapon

The player can purge the most recent upgrade from the active weapon.

- Input: P.
- Requires at least one upgrade on the active weapon.
- Removes the newest upgrade text entry.
- Lowers weapon damage by 2, down to a minimum of 12.
- Restores 10 sanity.

Note: Purge currently removes upgrade text and applies a simple damage penalty. It does not reverse the exact mechanical effect of non-damage upgrades.

## 13. Resource and Status Systems

### HP

HP is reduced by enemy melee, projectiles, and lasers. Death triggers at 0 HP.

### Stamina

Stamina gates mobility and attacks.

- Drains from boost, assault boost, quick boost, jump, left hand, right hand, and shoulder weapons.
- Regenerates when not actively boosting or assault boosting.

### Sanity

Sanity is a second fail condition.

- Drains over time based on active enemy count and decay.
- Enemy projectiles and melee attacks reduce sanity.
- Some mutated enemies can inflict extra sanity damage.
- Enemy kills restore a small amount of sanity.
- Purging weapon upgrades restores sanity.

### Goon

Goon represents aggression pressure.

- Rises while attacking or assault boosting.
- Falls while idle.
- Adds to melee damage.
- Is displayed as a core meter and stat.

### Decay

Decay represents clone and suit corrosion.

- Increases on deck transition.
- Increases more heavily after restart.
- Can be reduced by repair kits.
- Raises passive sanity drain.
- Barbed enemy mutations can add decay on melee hit.

### Repair Kits

Repair kits heal and reduce decay.

- Input: C.
- Starting count: 2.
- Maximum count: 5.
- Healing: 38 plus grit.
- Decay reduction: 0.35.
- Gained on some deck transitions based on wave parity.

## 14. Enemy System

### Enemy Archetypes

| Type | Label | HP | Speed | Damage | Range | Attack |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| zealot | Zealot | 44 | 3.7 | 13 | 1.8 | Melee |
| seraphRifle | Seraph Rifle | 36 | 2.8 | 10 | 27 | Shoot |
| womb | Womb Gate | 75 | 1.5 | 8 | 20 | Spawn |
| splitter | Split Halo | 40 | 3.2 | 11 | 2.2 | Split |
| charger | Throne Charger | 60 | 4.9 | 18 | 3.2 | Charge |
| laserSentry | Beam Reliquary | 88 | 0 | 16 | 38 | Laser |
| auraSpire | Choir Spire | 110 | 0 | 7 | 24 | Aura |
| skitter | Skitter | 18 | 5.2 | 6 | 1.3 | Melee minion |

### Enemy Scaling

When spawned, enemies gain procedural variation:

- HP and max HP are `(base HP + tier * 7) * variance`.
- Damage is `(base damage + tier * 1.25) * variance`.
- Speed is base speed plus tier scaling, with random variance.
- Range gains a small random addition.
- Visual size and model height scale modestly with tier.

### Enemy Behaviors

Melee:

- Moves toward the player until in range.
- Attacks on hit cooldown.
- Deals HP and sanity damage.

Shooter:

- Backs away slightly while in shooting range.
- Fires projectiles on cooldown.
- Frantic mutation fires triple shots.

Spawner:

- Moves slowly toward the player while in range.
- Spawns Zealots or Split Halos on cooldown.

Splitter:

- Behaves like a melee enemy.
- On death, if max HP is high enough, spawns two Zealots.

Charger:

- Rushes toward the player from extended range when off cooldown.
- Deals melee damage if close enough.

Laser Sentry:

- Stationary.
- Tracks the player and draws a beam.
- Ticks frequent low HP damage and sanity damage while in range.

Aura Spire:

- Stationary.
- Buffs nearby enemies.
- Spawns Skitters periodically.
- Emits periodic pulse feedback.

Skitter:

- Fast melee minion spawned by aura spires.

### Aura Buff

Aura spires mark nearby enemies as buffed.

- Buffed enemies move 1.28x faster.
- Buffed enemy damage is increased in projectile and melee formulas.
- Buffed or stationary enemies display elite-style HUD markers.

## 15. Enemy Mutation System

Enemies can receive mutations when spawned.

Current mutation names observed in combat logic:

- `fast`: Increases enemy movement speed.
- `armored`: Lowers movement speed but is part of mutation logic.
- `frantic`: Increases fallback visual spin and makes shooters fire triple shots.
- `sanity-leech`: Increases sanity damage from enemy projectiles and melee logic.
- `barbed`: Adds decay when the enemy lands melee damage.

Mutation assignment is tier-driven and randomized. The design intent is to add procedural combat identity on top of archetype behavior.

## 16. Wave and Spawn System

### Wave Count

Enemy count per deck:

`5 + floor(wave * 1.8)`

### Enemy Unlock Curve

Enemy archetypes unlock gradually.

- The available pool starts small.
- The pool expands by wave using `2 + floor(wave / 2)`, capped at all seven main types.
- From wave 2 onward, the first spawned enemy is forced to Beam Reliquary.
- From wave 3 onward, the second spawned enemy is forced to Choir Spire.

### Spawn Placement

- Enemies spawn from room spawn points, skipping the initial room when possible.
- `findSafePoint` searches for valid spawn locations inside floor zones.
- Spawns avoid colliders and remain on the navigable route.
- If a requested point is unsafe, the system searches candidate offsets, rings, and grid points.

## 17. Level and Procedural Route System

### Deck Identity

HUD deck names rotate through:

- Impact Scar
- Hangar Basilica
- Reactor Reliquary
- Keel Tomb
- Command Ossuary

### Route Generation

Each deck creates a linear route of rooms connected by corridors.

- Starts around the upper area of the map.
- Room count is `5 + min(4, floor(wave / 2))`.
- Rooms alternate between interior and exterior spaces.
- Corridors connect each room to the next.
- Next-room X position drifts within a clamped range.
- Next-room Z position moves progressively down the map.

### Terrain

- Ground plane is 560 by 560 units with 96 by 96 subdivisions.
- Route floors are flattened.
- Off-route terrain uses sine/cosine ridges and seeded noise.
- Fog density increases with wave.

### Rooms and Corridors

Interior rooms:

- Use dark hull floors.
- Use taller hull walls.
- Generate rectangular obstacle blocks.

Exterior rooms:

- Use ash floors.
- Use lower rust walls.
- Generate irregular circular rocks/debris.

Corridors:

- Use floor zones like rooms.
- Add side wall boxes for channeling movement.

### Collision

Static collision supports:

- Box colliders for walls and rectangular obstacles.
- Circle colliders for rocks and irregular assets.
- Collision resolution pushes circular actors out of static shapes.
- Player and enemy overlap resolution prevents stacking.
- Portal creation clears collision near the portal and along its approach lane.

## 18. Portal and Deck Transition System

When all enemies are defeated:

- `openPortal()` activates a breach portal at the far end of the route.
- The portal clears nearby collision and approach collision.
- The portal is represented by a cyan torus, violet core, and point light.
- The portal rotates and pulses.
- If the player comes within 4.3 units, `nextLevel()` triggers.

Deck transition effects:

- Wave increases by 1.
- Player level increases by 1.
- Age increases by 1.
- Decay increases by 0.55.
- Speed decreases by 0.08, down to minimum 7.5.
- HP heals by 20, capped at 100.
- Repair kits increase on alternating waves, capped at 5.
- Level regenerates, projectiles are cleared, and a new wave spawns.

## 19. Death and Restart System

Death occurs when:

- HP is at or below 0.
- Sanity is at or below 0.

On death:

- Player dead flag is set.
- Death overlay appears.
- Combat and enemy updates pause.

Restart:

- Input: R while dead, or Backspace at any time to restart.
- Clears enemies, impacts, projectiles, lock-on, and portal state.
- Resets wave to 1.
- Increases age by 7.
- Increases decay by 3.
- Recomputes speed from decay, with minimum 8.
- Randomizes INT, STR, grit, and luck within small ranges.
- Resets HP, stamina, sanity, goon, cooldowns, repair kits, and kills.
- Clears all weapon upgrades.
- Regenerates level and spawns wave 1.

## 20. UI and HUD Systems

### Always-On HUD

Current HUD elements:

- Brand and deck name.
- HP, stamina, sanity, and goon meters.
- Stat grid: age, decay, speed, INT, STR, grit, luck, kills, sanity, goon.
- Lock-on button and status.
- Collision debug button.
- Combat cooldown slots.
- Weapon/deck/hostile/portal/repair kit status.
- Context message log.
- Enemy indicators with HP bars.

### Combat HUD

Displays input slots for:

- LMB
- RMB
- Q
- E
- Shift
- Space
- T

Each slot displays label and cooldown/readiness.

### Enemy Indicators

Each enemy can show a screen-space marker.

- Marker position is projected from world space.
- Marker shows distance, or special labels for laser/aura/minion.
- Marker includes enemy HP bar.
- Locked target and elite/buffed enemies receive special styling.

### Character Sheet

Opened with H or F.

Contains:

- Movement controls.
- Combat and system controls.
- Core stats.
- Equipped items.
- Active buffs and status.
- Stat reference.
- Upgrade log.

Opening the character sheet exits pointer lock and pauses combat/player updates.

### Control Scheme Menu

Opened with M.

Contains:

- Movement bindings.
- Combat bindings.
- Menus and utility bindings.

Opening the controls menu exits pointer lock and pauses combat/player updates.

### Death Overlay

Displays when the player dies:

- "You are archived in moon dust."
- Explains the clone restart.
- Prompts R to restart.

## 21. Debug and Tooling Systems

### Collision Debug View

Collision debug can be toggled by:

- F3
- HUD button: Collision View

When enabled:

- Static box colliders render as red wireframes.
- Static circle colliders render as yellow wireframes.
- Player collision radius renders as cyan wireframe.
- Enemy collision radii render as purple wireframes.
- Static debug geometry rebuilds only when marked dirty.
- Dynamic debug geometry updates each frame.

This system supports rapid tuning of route access, safe spawn placement, obstacle layout, and portal collision clearing.

## 22. Visual and Audio Direction

### Visual Style

The implemented visual direction is dark lunar industrial horror:

- Black/grey moon terrain.
- Ash exterior floors.
- Metal hull interiors.
- Rusted debris and walls.
- Bone, ember, violet, cyan, and poison enemy accents.
- Star field overhead.
- Fog that thickens across later waves.

### Enemy Models

GLB enemy model mappings:

| Enemy Type | Model |
| --- | --- |
| zealot | Meshy AI Fallen Reaver |
| seraphRifle | Meshy AI Cherubim Lancer |
| womb | Meshy AI Orphan of the Choir |
| splitter | Meshy AI Judgment Bearer |
| charger | Meshy AI Eye of the Throne |

If a GLB fails or has no mapping, enemies use procedural fallback visuals made of geometric core, eye, and wing/cone elements.

### Current Audio

No implemented audio system was found in the current code.

## 23. Technical Implementation Notes

Current stack:

- HTML/CSS/JavaScript.
- Three.js via import map from unpkg.
- GLTFLoader for enemy model loading.
- Single primary gameplay file: `src/main.js`.

Main tick order:

1. Compute delta time, clamped to 0.033.
2. Update player.
3. Update projectiles.
4. Update enemies.
5. Update portal.
6. Update camera.
7. Update enemy indicators.
8. Update HUD.
9. Update collision debug.
10. Render scene.
11. Request next animation frame.

## 24. Current Content Inventory

### Implemented Gameplay Systems

- Third-person camera and pointer lock.
- Keyboard movement.
- Boost, assault boost, quick boost, jump, gravity.
- Static collision and entity collision response.
- Procedural route generation.
- Procedural terrain.
- Room, corridor, wall, and obstacle generation.
- Enemy spawning with safe-point search.
- Eight enemy archetypes.
- Enemy HP, damage, speed, range, cooldowns, buffs, mutations.
- Melee, shooting, spawning, splitting, charging, laser, aura, and minion behaviors.
- Player HP, stamina, sanity, goon, age, decay, speed, INT, STR, grit, luck.
- Three weapons.
- Melee attacks, projectile attacks, shoulder weapons, chain damage.
- Lock-on targeting.
- Random upgrades on kill.
- Weapon purge.
- Repair kits.
- Scanning enemy counts.
- Portal clear condition and deck transition.
- Death and restart loop.
- Character sheet.
- Controls menu.
- Enemy screen indicators.
- Collision debug view.

### Partially Represented or Not Fully Used

- Luck is described but not actively used in upgrade selection or mutations in the observed implementation.
- Orbitals exists as a weapon property but no orbital behavior is implemented.
- "Shift Control" is listed as R in combat bindings, but R currently cycles weapon.
- Purge does not reverse exact non-damage upgrade effects.
- No audio system is implemented.
- No save/load system is implemented.
- No formal boss system is implemented.

## 25. Design Risks and Next Design Questions

- The kill-based upgrade system may scale extremely fast because every enemy grants an upgrade.
- Sanity, decay, and goon are evocative but could use clearer player-facing cause/effect feedback.
- Luck needs a concrete gameplay function or should be removed from displayed core stats.
- Restart currently makes future clones older and more decayed, which is thematically strong but may create a negative spiral.
- Enemy indicators reveal all enemies on screen, which helps combat readability but may reduce exploration tension.
- The weapon purge system should either become a deliberate tradeoff mechanic or reverse upgrade effects accurately.
- Collision debug is useful and should remain clearly separated from player-facing production UI.

## 26. Suggested GDD Maintenance Rule

Update this document whenever gameplay behavior changes in `src/main.js`, especially when adding:

- New weapons or weapon modes.
- New enemy archetypes or mutations.
- New stat functions.
- New progression or deck transition rules.
- New HUD or menu systems.
- Any change to core controls.

