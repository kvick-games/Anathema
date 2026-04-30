export type GameObjectKind = "enemy" | "projectile" | "effect" | "levelObject" | string;

let nextObjectId = 1;

export interface GameObject {
  readonly id: number;
  readonly kind: GameObjectKind;
  alive: boolean;
  destroy(): void;
  update(ctx: any, dt: number): void;
  dispose(ctx: any): void;
}

export abstract class BaseGameObject implements GameObject {
  readonly id = nextObjectId++;
  alive = true;

  protected constructor(readonly kind: GameObjectKind) {}

  update(_ctx: any, _dt: number): void {}

  dispose(_ctx: any): void {}

  destroy(): void {
    this.alive = false;
  }
}

export abstract class SceneGameObject extends BaseGameObject {
  protected constructor(kind: GameObjectKind, public object: any) {
    super(kind);
  }

  dispose(ctx: any): void {
    if (!this.object) return;
    if (this.object.parent) {
      this.object.parent.remove(this.object);
    } else if (ctx?.scene) {
      ctx.scene.remove(this.object);
    }
  }
}

export class EntityManager {
  enemies: any[] = [];
  projectiles: any[] = [];
  effects: any[] = [];
  levelObjects: any[] = [];

  addEnemy<T extends GameObject>(enemy: T): T {
    this.enemies.push(enemy);
    return enemy;
  }

  addProjectile<T extends GameObject>(projectile: T): T {
    this.projectiles.push(projectile);
    return projectile;
  }

  addEffect<T extends GameObject>(effect: T): T {
    this.effects.push(effect);
    return effect;
  }

  addLevelObject<T>(object: T): T {
    this.levelObjects.push(object);
    return object;
  }

  removeEnemy(enemy: GameObject, ctx: any): void {
    this.removeObject(this.enemies, enemy, ctx);
  }

  removeProjectile(projectile: GameObject, ctx: any): void {
    this.removeObject(this.projectiles, projectile, ctx);
  }

  removeEffect(effect: GameObject, ctx: any): void {
    this.removeObject(this.effects, effect, ctx);
  }

  updateEffects(ctx: any, dt: number): void {
    this.updateCollection(this.effects, ctx, dt);
  }

  clearEnemies(ctx: any): void {
    this.clearCollection(this.enemies, ctx);
  }

  clearProjectiles(ctx: any): void {
    this.clearCollection(this.projectiles, ctx);
  }

  clearEffects(ctx: any): void {
    this.clearCollection(this.effects, ctx);
  }

  clearLevelObjects(ctx: any): void {
    for (const object of this.levelObjects.splice(0)) {
      if (typeof object.dispose === "function") {
        object.dispose(ctx);
      } else {
        ctx.scene.remove(object);
      }
    }
  }

  private updateCollection(collection: GameObject[], ctx: any, dt: number): void {
    for (let i = collection.length - 1; i >= 0; i -= 1) {
      const object = collection[i];
      if (object.alive) object.update(ctx, dt);
      if (!object.alive) {
        object.dispose(ctx);
        collection.splice(i, 1);
      }
    }
  }

  private removeObject(collection: GameObject[], object: GameObject, ctx: any): void {
    const index = collection.indexOf(object);
    if (index === -1) return;
    object.destroy();
    object.dispose(ctx);
    collection.splice(index, 1);
  }

  private clearCollection(collection: GameObject[], ctx: any): void {
    for (const object of collection.splice(0)) {
      object.destroy();
      object.dispose(ctx);
    }
  }
}
