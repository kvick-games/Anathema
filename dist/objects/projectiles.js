import { BaseGameObject } from "../core/gameObject.js";
export class ProjectileEntity extends BaseGameObject {
    owner;
    pos;
    dir;
    life;
    damage;
    speed;
    radius;
    pierce;
    sanity;
    constructor(options) {
        super("projectile");
        this.owner = options.owner;
        this.pos = options.pos;
        this.dir = options.dir;
        this.life = options.life;
        this.damage = options.damage;
        this.speed = options.speed;
        this.radius = options.radius;
        this.pierce = options.pierce ?? 0;
        this.sanity = options.sanity;
    }
}
export class ProjectileFactory {
    entities;
    constructor(entities) {
        this.entities = entities;
    }
    create(options) {
        return this.entities.addProjectile(new ProjectileEntity(options));
    }
}
