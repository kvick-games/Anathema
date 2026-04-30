import * as THREE from "three";
import { SceneGameObject } from "../core/gameObject.js";
export class TimedEffect extends SceneGameObject {
    mesh;
    life;
    maxLife;
    velocity;
    gravity;
    spin;
    disposeMaterial;
    disposeGeometry;
    constructor(options) {
        super("effect", options.mesh);
        Object.assign(this, options);
        this.mesh = options.mesh;
    }
    update(_ctx, dt) {
        this.life -= dt;
        if (this.velocity) {
            this.velocity.y -= (this.gravity ?? 0) * dt;
            this.mesh.position.addScaledVector(this.velocity, dt);
        }
        if (this.spin) {
            this.mesh.rotation.x += this.spin.x * dt;
            this.mesh.rotation.y += this.spin.y * dt;
            this.mesh.rotation.z += this.spin.z * dt;
        }
        if (this.maxLife && this.mesh.scale) {
            const fade = THREE.MathUtils.clamp(this.life / this.maxLife, 0, 1);
            this.mesh.scale.setScalar(Math.max(0.01, fade));
            if (this.mesh.material?.opacity !== undefined)
                this.mesh.material.opacity = fade * 0.95;
        }
        if (this.life <= 0)
            this.alive = false;
    }
    dispose(ctx) {
        ctx.scene.remove(this.mesh);
        if (this.disposeGeometry && this.mesh.geometry)
            this.mesh.geometry.dispose();
        if (this.disposeMaterial && this.mesh.material)
            this.mesh.material.dispose();
    }
}
export class EffectFactory {
    entities;
    constructor(entities) {
        this.entities = entities;
    }
    timed(ctx, options) {
        const effect = new TimedEffect(options);
        ctx.scene.add(effect.mesh);
        return this.entities.addEffect(effect);
    }
    spark(ctx, position, velocity, color, size, life) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 4), this.particleMaterial(color));
        mesh.position.copy(position);
        return this.timed(ctx, {
            mesh,
            life,
            maxLife: life,
            velocity,
            gravity: 7.5,
            spin: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
            disposeMaterial: true,
            disposeGeometry: true,
        });
    }
    burstParticles(ctx, position, color, count = 12, power = 5, size = 0.055, yBias = 1.1) {
        for (let i = 0; i < count; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = power * (0.45 + Math.random() * 0.9);
            const velocity = new THREE.Vector3(Math.cos(angle) * speed, yBias + Math.random() * power * 0.55, Math.sin(angle) * speed);
            this.spark(ctx, position.clone().add(new THREE.Vector3(0, 0.8 + Math.random() * 0.5, 0)), velocity, color, size * (0.7 + Math.random() * 0.8), 0.35 + Math.random() * 0.28);
        }
    }
    muzzleBurst(ctx, position, direction, color = 0xffd36a) {
        for (let i = 0; i < 8; i += 1) {
            const side = new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.7, (Math.random() - 0.5) * 1.2);
            const velocity = direction.clone().multiplyScalar(7 + Math.random() * 7).add(side);
            this.spark(ctx, position.clone().add(direction.clone().multiplyScalar(0.7)), velocity, color, 0.045 + Math.random() * 0.035, 0.18 + Math.random() * 0.14);
        }
    }
    slashArc(ctx, position, direction) {
        const origin = position.clone().add(new THREE.Vector3(0, 1.1, 0)).add(direction.clone().multiplyScalar(1.4));
        const right = new THREE.Vector3(-direction.z, 0, direction.x);
        for (let i = -5; i <= 5; i += 1) {
            const t = i / 5;
            const point = origin.clone().add(right.clone().multiplyScalar(t * 1.3)).add(new THREE.Vector3(0, 0.35 * (1 - Math.abs(t)), 0));
            const velocity = direction.clone().multiplyScalar(2.5).add(right.clone().multiplyScalar(t * 4)).add(new THREE.Vector3(0, 1.2, 0));
            this.spark(ctx, point, velocity, 0xffc87a, 0.05, 0.24 + Math.random() * 0.12);
        }
    }
    levelCompleteBurst(ctx, position) {
        this.burstParticles(ctx, position, 0x7bd4ff, 34, 8.5, 0.075, 2.4);
        this.burstParticles(ctx, position, 0xb45cff, 24, 6.8, 0.065, 2.1);
        this.burstParticles(ctx, position, 0xffd36a, 18, 5.4, 0.055, 2.0);
    }
    pulse(ctx, position, color) {
        const flash = new THREE.PointLight(color, 30, 10, 2);
        flash.position.copy(position).add(new THREE.Vector3(0, 1.2, 0));
        return this.timed(ctx, { mesh: flash, life: 0.08 });
    }
    particleMaterial(color, opacity = 0.95) {
        return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    }
}
