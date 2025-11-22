import { onActivated, onBeforeUnmount, onDeactivated, Ref, ref } from "vue";
import * as THREE from "three";

export function useThreeScene() {
  const active: Ref<boolean> = ref(false);
  let frameId: number = 0;
  const gridlines = ref(true);
  const gridHelper = new THREE.GridHelper(200, 50);
  
  let scene: THREE.Scene | null = null;
  let animateCallback: (() => void) | null = null;

  function setScene(sceneInstance: THREE.Scene) {
    scene = sceneInstance;
  }

  function setAnimateCallback(callback: () => void) {
    animateCallback = callback;
  }

  function animate() {
    if (!animateCallback) return;
    
    animateCallback();
    frameId = requestAnimationFrame(animate);
  }

  function toggleGridlines(): void {
    if (!scene) return;
    
    if (!gridlines.value) {
      scene.remove(gridHelper);
    } else {
      scene.add(gridHelper);
    }
  }

  onActivated(() => {
    active.value = true;
    animate();
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(frameId);
  });

  onDeactivated(() => {
    active.value = false;
    cancelAnimationFrame(frameId);
  });

  return {
    active,
    gridlines,
    gridHelper,
    toggleGridlines,
    setScene,
    setAnimateCallback,
  };
}