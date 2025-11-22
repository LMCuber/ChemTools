
<template>
  <!-- grid for the settings and canvas -->
    <div id="grid">
      <!-- settings bar containing the buttons and checks -->
        <div ref="settingsBar" class="settings border">
            <Recenter v-if="controls" :controls="controls"></Recenter>
            <hr>

            <label class="settings-label">
                <input type="checkbox" v-model="gridlines" @change="toggleGridlines"/>
                <span>Gridlines</span>
            </label>

            <hr>
            <button @click=generateTerrain>Apply</button>
            
        </div>

        <canvas id="canvas" class="border"></canvas>

    </div>

</template>

<script setup lang="ts">
  import { computed, getCurrentInstance, onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, Ref, ref, useTemplateRef } from "vue"
  import * as THREE from "three"
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { getCSSVar, randHex } from "../utils/commons";
  import Recenter from "./Recenter.vue";
  import { useThreeScene } from "../composables/useThreeScene";
  import { useNoise } from "../composables/useNoise";

  // composables
  const { gridlines, gridHelper, toggleGridlines, setScene, setAnimateCallback } = useThreeScene();
  const { seed, noise, octaveNoise, reseed } = useNoise(42);

  // data refs
  const canvas = reactive({
    width: getCSSVar("--canvas-width"),
    height: getCSSVar("--canvas-height"),
  })

  // template refs
  const settingsBar = useTemplateRef("settingsBar");

  // 3D rendering
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let renderer: THREE.WebGLRenderer;
  let pointLight: THREE.PointLight;
  let controls: Ref<OrbitControls | null> = ref(null);
  
  // other
  const deletables = [];
  
  onMounted(() => {
    // template ref
    settingsBar.value.style.height = `${canvas.height}px`;

    // initialize the rendering target
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector("#canvas"),
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.width, canvas.height);
    renderer.setClearColor(getCSSVar("--palette-primary"), 1);

    // interact with composable
    setScene(scene);

    // camera
    camera.position.setZ(4);

    // lighting
    const ambient = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambient);
    pointLight = new THREE.PointLight(0xFFFFFF);
    pointLight.position.set(0, 5, 0);
    pointLight.intensity = 30;
    scene.add(pointLight);
    // const plHelper = new THREE.PointLightHelper(pointLight);
    // scene.add(plHelper);

    // gridlines and controls
    controls.value = new OrbitControls(camera, renderer.domElement);
    scene.add(gridHelper);
  })

  setAnimateCallback(() => {
    // Your component-specific animation code
    controls.value.update();

    // render the scene
    renderer.render(scene, camera);
  });

  function generateTerrain() {
    // first delete the previous terrain
    for (const del of deletables) {
      scene.remove(del);
    }
    deletables.length = 0;

    const geometry = new THREE.SphereGeometry(0.15, 64, 64);
    
    reseed(Math.random());
    const n = 8;
    const freq = 0.12;

    for (let z = -n / 2; z < n / 2; z++) {
      for (let y = -n / 2; y < n / 2; y++) {
        for (let x = -n / 2; x < n / 2; x++) {
          let height = (octaveNoise(x * freq, y * freq, z * freq) + 1) / 2;

          if (height >= 0.5) {
            height = 1;
          } else {
            height = 0;
          }

          const ph_material = new THREE.MeshPhongMaterial({
                          color: new THREE.Color(height, height, height),
                          shininess: 50,
                          specular: 0x333333,
                      });

          const mesh = new THREE.Mesh(geometry, ph_material);
          mesh.position.set(0.3 * x, 0.3 * y, 0.3 * z, 0);
          scene.add(mesh);
          deletables.push(mesh);
        }
      }
    }
  }

</script>

<style scoped>
  #grid {
    display: grid;
    grid-template-columns: var(--settings-width) 70%;
  }

  #canvas {
    grid-column: 2 / span 1;
    grid-row: 1 / span 2;
  }

</style>
