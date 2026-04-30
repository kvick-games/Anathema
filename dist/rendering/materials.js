import * as THREE from "three";
export function createMaterials() {
    return {
        moon: new THREE.MeshStandardMaterial({ color: 0x2a2a29, roughness: 0.96, metalness: 0.04 }),
        ash: new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.9, metalness: 0.1 }),
        hull: new THREE.MeshStandardMaterial({ color: 0x303941, roughness: 0.74, metalness: 0.56 }),
        hullDark: new THREE.MeshStandardMaterial({ color: 0x11171b, roughness: 0.9, metalness: 0.42 }),
        rust: new THREE.MeshStandardMaterial({ color: 0x7b3827, roughness: 0.86, metalness: 0.24 }),
        bone: new THREE.MeshStandardMaterial({ color: 0xb8ac95, roughness: 0.66, metalness: 0.08 }),
        ember: new THREE.MeshStandardMaterial({ color: 0xff6f31, emissive: 0x9d1d0a, emissiveIntensity: 1.2 }),
        violet: new THREE.MeshStandardMaterial({ color: 0x68458f, emissive: 0x271047, emissiveIntensity: 0.8 }),
        cyan: new THREE.MeshStandardMaterial({ color: 0x7bd4ff, emissive: 0x0a4d76, emissiveIntensity: 0.85 }),
        poison: new THREE.MeshStandardMaterial({ color: 0x8bff79, emissive: 0x184f12, emissiveIntensity: 0.7 }),
        player: new THREE.MeshStandardMaterial({ color: 0xc7c1ac, roughness: 0.46, metalness: 0.28 }),
        blade: new THREE.MeshStandardMaterial({ color: 0xd9e5e7, roughness: 0.28, metalness: 0.76 }),
        tracer: new THREE.MeshBasicMaterial({ color: 0xffd36a }),
        hostileTracer: new THREE.MeshBasicMaterial({ color: 0xb45cff }),
        lock: new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.82 }),
        laser: new THREE.MeshBasicMaterial({ color: 0xff304f }),
        collisionBox: new THREE.MeshBasicMaterial({ color: 0xff4a4a, wireframe: true, transparent: true, opacity: 0.72, depthTest: false }),
        collisionCircle: new THREE.MeshBasicMaterial({ color: 0xffd36a, wireframe: true, transparent: true, opacity: 0.82, depthTest: false }),
        collisionPlayer: new THREE.MeshBasicMaterial({ color: 0x7bd4ff, wireframe: true, transparent: true, opacity: 0.9, depthTest: false }),
        collisionEnemy: new THREE.MeshBasicMaterial({ color: 0xb45cff, wireframe: true, transparent: true, opacity: 0.78, depthTest: false }),
    };
}
