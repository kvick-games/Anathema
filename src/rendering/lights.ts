import * as THREE from "three";

export function addLights(scene: any) {
  scene.add(new THREE.HemisphereLight(0x667080, 0x100b08, 0.55));

  const sun = new THREE.DirectionalLight(0xd8e6ff, 2.1);
  sun.position.set(-80, 140, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -130;
  sun.shadow.camera.right = 130;
  sun.shadow.camera.top = 130;
  sun.shadow.camera.bottom = -130;
  scene.add(sun);

  const wound = new THREE.PointLight(0xff4b22, 180, 90, 2);
  wound.position.set(22, 16, -18);
  scene.add(wound);
}
