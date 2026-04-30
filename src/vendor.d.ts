declare module "three";
declare module "three/addons/loaders/GLTFLoader.js";

interface Window {
  webkitAudioContext?: typeof AudioContext;
}
