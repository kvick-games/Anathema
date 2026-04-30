import * as THREE from "three";
import type { EntityManager } from "../core/gameObject.js";
import type { EffectFactory } from "../objects/effects.js";
import type { ProjectileEntity } from "../objects/projectiles.js";

interface ProjectileSystemDependencies {
  projectiles: ProjectileEntity[];
  enemies: any[];
  colliders: any[];
  player: any;
  materials: Record<string, any>;
  entities: EntityManager;
  effectFactory: EffectFactory;
  playSfx: (name: string, intensity?: number) => void;
}

export class ProjectileSystem {
  constructor(private deps: ProjectileSystemDependencies) {}

  update(ctx: any, dt: number): void {
    const { projectiles, enemies, colliders, player, materials, entities, effectFactory, playSfx } = this.deps;
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const p = projectiles[i];
      const start = p.pos.clone();
      p.pos.addScaledVector(p.dir, p.speed * dt);
      p.life -= dt;
      for (const collider of colliders) {
        const blocked = collider.type === "circle"
          ? Math.hypot(p.pos.x - collider.x, p.pos.z - collider.z) < collider.r
          : Math.abs(p.pos.x - collider.x) < collider.w / 2 && Math.abs(p.pos.z - collider.z) < collider.d / 2;
        if (blocked && p.pos.y < 6) p.life = 0;
      }

      const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, start.distanceTo(p.pos)), p.owner === "player" ? materials.tracer : materials.hostileTracer);
      line.position.copy(start).lerp(p.pos, 0.5);
      line.lookAt(p.pos);
      effectFactory.timed(ctx, { mesh: line, life: 0.045 });

      if (p.owner === "player") {
        for (const enemy of enemies) {
          if (enemy.group.position.distanceTo(p.pos) < p.radius) {
            enemy.hp -= p.damage;
            p.pierce -= 1;
            playSfx("hit", 0.65);
            effectFactory.burstParticles(ctx, enemy.group.position, 0xffd36a, 9, 4.7, 0.052);
            effectFactory.pulse(ctx, enemy.group.position, 0xffd36a);
            if (p.pierce < 0) p.life = 0;
          }
        }
      } else if (!player.dead && player.invuln <= 0 && player.group.position.distanceTo(p.pos) < p.radius) {
        player.hp -= Math.max(3, p.damage - player.grit * 0.32);
        player.sanity -= p.sanity ?? 3;
        p.life = 0;
        playSfx("hit", 0.75);
        effectFactory.burstParticles(ctx, player.group.position, 0xb45cff, 10, 4.2, 0.055);
        effectFactory.pulse(ctx, player.group.position, 0xa23cff);
      }

      if (p.life <= 0) entities.removeProjectile(p, ctx);
    }

    entities.updateEffects(ctx, dt);
  }
}
