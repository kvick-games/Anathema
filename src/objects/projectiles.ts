import { BaseGameObject, EntityManager } from "../core/gameObject.js";

export type ProjectileOwner = "player" | "enemy";

export interface ProjectileOptions {
  owner: ProjectileOwner;
  pos: any;
  dir: any;
  life: number;
  damage: number;
  speed: number;
  radius: number;
  pierce?: number;
  sanity?: number;
}

export class ProjectileEntity extends BaseGameObject {
  owner: ProjectileOwner;
  pos: any;
  dir: any;
  life: number;
  damage: number;
  speed: number;
  radius: number;
  pierce: number;
  sanity?: number;

  constructor(options: ProjectileOptions) {
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
  constructor(private entities: EntityManager) {}

  create(options: ProjectileOptions): ProjectileEntity {
    return this.entities.addProjectile(new ProjectileEntity(options));
  }
}
