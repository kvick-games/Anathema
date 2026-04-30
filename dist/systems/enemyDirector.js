export class EnemyDirector {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    spawnWave(ctx) {
        const { spawnPoints, physics, findSafePoint, makeEnemy, hud, updateMusic } = this.deps;
        const wave = ctx.state.wave;
        const count = 5 + Math.floor(wave * 1.8);
        ctx.state.waveHostileCount = count;
        for (let i = 0; i < count; i += 1) {
            const spawn = spawnPoints[1 + (i % Math.max(1, spawnPoints.length - 1))] ?? spawnPoints[0] ?? { x: 0, z: 0, room: { w: 70, d: 70 } };
            const room = spawn.room ?? { w: 70, d: 70 };
            const safe = findSafePoint(room, physics.enemyRadius, spawn);
            const unlocked = ["zealot", "splitter", "charger", "seraphRifle", "womb", "laserSentry", "auraSpire"].slice(0, Math.min(7, 2 + Math.floor(wave / 2)));
            const type = i === 0 && wave >= 2 ? "laserSentry" : i === 1 && wave >= 3 ? "auraSpire" : unlocked[Math.floor(Math.random() * unlocked.length)];
            makeEnemy(safe.x, safe.z, type, wave);
        }
        hud.message.textContent = `Deck ${wave}: follow the route through ${spawnPoints.length} rooms and exterior breaches.`;
        updateMusic(true);
    }
    update(ctx, dt) {
        const { enemies, player, hud, physics, applyGravity, turnToward, enemyLaser, enemySpawn, enemyShoot, enemyMelee, resolveCircleCollision, terrainHeight, killEnemy, openPortal, } = this.deps;
        if (player.dead || !hud.codex.hidden || !hud.controls.hidden)
            return;
        for (const enemy of enemies)
            enemy.buffed = 0;
        for (const spire of enemies) {
            if (spire.attack !== "aura")
                continue;
            for (const enemy of enemies) {
                if (enemy !== spire && enemy.group.position.distanceTo(spire.group.position) < spire.range)
                    enemy.buffed = 1;
            }
        }
        const tmp = ctx.tmpVector;
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
            }
            else {
                enemy.group.rotation.y += dt * (enemy.mutations.includes("frantic") ? 3.4 : 1.7);
                enemy.group.rotation.x = Math.sin(enemy.phase * 2) * 0.2;
                enemy.visual.position.y = 0;
            }
            if (enemy.attack === "laser" && dist < enemy.range) {
                enemyLaser(enemy, dt);
            }
            else if (enemy.attack === "aura") {
                if (enemy.spawnCd <= 0)
                    enemySpawn(enemy, "skitter", 3);
                if (enemy.auraFx <= 0) {
                    enemy.auraFx = 0.65;
                    ctx.effectFactory.pulse(ctx, enemy.group.position, 0x8bff79);
                }
            }
            else if (enemy.attack === "shoot" && dist < enemy.range) {
                enemy.group.position.addScaledVector(dir, -speed * 0.35 * dt);
                if (enemy.cooldown <= 0)
                    enemyShoot(enemy, dir);
            }
            else if (enemy.attack === "spawn" && dist < enemy.range) {
                enemy.group.position.addScaledVector(dir, speed * 0.25 * dt);
                if (enemy.spawnCd <= 0)
                    enemySpawn(enemy);
            }
            else if (enemy.attack === "charge" && dist < enemy.range * 4 && enemy.cooldown <= 0) {
                enemy.group.position.addScaledVector(dir, speed * 4.2 * dt);
                if (dist < 2.5)
                    enemyMelee(enemy);
            }
            else if (dist > enemy.range) {
                enemy.group.position.addScaledVector(dir, speed * dt);
            }
            else {
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
                resolveCircleCollision(enemy.group.position, physics.enemyRadius);
                resolveCircleCollision(player.group.position, physics.playerRadius);
            }
            enemy.group.position.y = terrainHeight(enemy.group.position.x, enemy.group.position.z) + physics.enemyHeight;
            if (enemy.hp <= 0)
                killEnemy(i, enemy);
        }
        if (!player.dead && enemies.length === 0)
            openPortal();
    }
}
