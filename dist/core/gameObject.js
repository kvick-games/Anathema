let nextObjectId = 1;
export class BaseGameObject {
    kind;
    id = nextObjectId++;
    alive = true;
    constructor(kind) {
        this.kind = kind;
    }
    update(_ctx, _dt) { }
    dispose(_ctx) { }
    destroy() {
        this.alive = false;
    }
}
export class SceneGameObject extends BaseGameObject {
    object;
    constructor(kind, object) {
        super(kind);
        this.object = object;
    }
    dispose(ctx) {
        if (!this.object)
            return;
        if (this.object.parent) {
            this.object.parent.remove(this.object);
        }
        else if (ctx?.scene) {
            ctx.scene.remove(this.object);
        }
    }
}
export class EntityManager {
    enemies = [];
    projectiles = [];
    effects = [];
    levelObjects = [];
    addEnemy(enemy) {
        this.enemies.push(enemy);
        return enemy;
    }
    addProjectile(projectile) {
        this.projectiles.push(projectile);
        return projectile;
    }
    addEffect(effect) {
        this.effects.push(effect);
        return effect;
    }
    addLevelObject(object) {
        this.levelObjects.push(object);
        return object;
    }
    removeEnemy(enemy, ctx) {
        this.removeObject(this.enemies, enemy, ctx);
    }
    removeProjectile(projectile, ctx) {
        this.removeObject(this.projectiles, projectile, ctx);
    }
    removeEffect(effect, ctx) {
        this.removeObject(this.effects, effect, ctx);
    }
    updateEffects(ctx, dt) {
        this.updateCollection(this.effects, ctx, dt);
    }
    clearEnemies(ctx) {
        this.clearCollection(this.enemies, ctx);
    }
    clearProjectiles(ctx) {
        this.clearCollection(this.projectiles, ctx);
    }
    clearEffects(ctx) {
        this.clearCollection(this.effects, ctx);
    }
    clearLevelObjects(ctx) {
        for (const object of this.levelObjects.splice(0)) {
            if (typeof object.dispose === "function") {
                object.dispose(ctx);
            }
            else {
                ctx.scene.remove(object);
            }
        }
    }
    updateCollection(collection, ctx, dt) {
        for (let i = collection.length - 1; i >= 0; i -= 1) {
            const object = collection[i];
            if (object.alive)
                object.update(ctx, dt);
            if (!object.alive) {
                object.dispose(ctx);
                collection.splice(i, 1);
            }
        }
    }
    removeObject(collection, object, ctx) {
        const index = collection.indexOf(object);
        if (index === -1)
            return;
        object.destroy();
        object.dispose(ctx);
        collection.splice(index, 1);
    }
    clearCollection(collection, ctx) {
        for (const object of collection.splice(0)) {
            object.destroy();
            object.dispose(ctx);
        }
    }
}
