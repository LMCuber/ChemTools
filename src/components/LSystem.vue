
<template>
  <!-- grid for the settings and canvas -->
  <div id="grid">
      <!-- settings bar containing the buttons and checks -->
      <div ref="settingsBar" class="settings border">
          <div class="settings-row">
            <label>Axiom</label>
            <input type="text" spellcheck="false" v-model="axiomRef" @keyup.enter="generatePattern">
          </div>
          <hr>

          <label title="[/] = push/pop, +/- = rotate, 0/1 = go forward">Rules</label>
          <textarea v-model="rulesRef" name="Text1" rows="5" spellcheck="false"></textarea>
          <hr>
          
          <div class="settings-row">
            <label>Angle</label>
            <input type="text" v-model="angleRef">
          </div>
          <hr>

          <label>Iterations: {{ iterations }}</label>
          <input v-model="iterations" type="range" min="0" max="10">

          <Recenter v-if="controls" :controls="controls"></Recenter>
          <hr>
          <button @click=generatePattern>Apply</button>
      </div>

      <canvas id="canvas" class="border"></canvas>

    </div>

</template>

<script setup lang="ts">
  import { computed, getCurrentInstance, onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, Ref, ref, useTemplateRef } from "vue"
  import * as THREE from "three"
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { getCSSVar } from "../utils/commons";
  import Recenter from "./Recenter.vue";

  // lifecycle values
  const active: Ref<boolean> = ref(false);
  let frameId: number = 0;

  // data refs
  const axiomRef: Ref<string> = ref("G");
  const angleRef: Ref<number> = ref(45);
  const canvas = reactive({
    width: getCSSVar("--canvas-width"),
    height: getCSSVar("--canvas-height"),
  })
  const rulesRef: Ref<string> = ref("G -> F[+G]-G\nF -> FF\n");
  const iterations: Ref<number> = ref(1);

  // template refs
  const settingsBar = useTemplateRef("settingsBar");

  // 3D rendering
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let renderer: THREE.WebGLRenderer;
  let pointLight: THREE.PointLight;
  let controls: Ref<OrbitControls | null> = ref(null);
  
  // other
  const deletables: THREE.Line[] = [];
  
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

    // camera
    camera.position.setZ(4);

    // lighting
    const ambient = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambient);
    pointLight = new THREE.PointLight(0xFFFFFF);
    pointLight.position.set(0, 0, 0);
    pointLight.intensity = 30;
    scene.add(pointLight);
    // const plHelper = new THREE.PointLightHelper(pointLight);
    // scene.add(plHelper);

    // gridlines and controls
    controls.value = new OrbitControls(camera, renderer.domElement);
  })

  onActivated(() => {
    active.value = true;
    animate();
  })

  // run when deactivated
  onBeforeUnmount(() => {
    cancelAnimationFrame(frameId);
  })
  
  onDeactivated(() => {
    active.value = false;
    cancelAnimationFrame(frameId);
  })

  const angleRadians = computed(() => angleRef.value * (Math.PI / 180));
  const scale = computed(() => 2 / (Math.pow(iterations.value, 2)));

  function animate() {
    // update the controls
    controls.value.update();

    // render the scene
    renderer.render(scene, camera);

    // animate
    frameId = requestAnimationFrame(animate);
  }

  function generatePattern() {
    // delete the old pattern
    for (const del of deletables) {
      scene.remove(del);
    }
    deletables.length = 0;

    // step function
    function step(axiom: string): string {
      let final: string = "";
      for (const symbol of axiom) {
        final += rules[symbol] || symbol;
      }
      return final;
    }

    // stupid interface
    interface SaveData {
      pos: THREE.Vector3,
      angle: number,
    }

    // get the user axiom
    let axiom: string = axiomRef.value;

    // convert user input to rules dictionary
    const rules = rulesRef.value.split("\n").reduce((acc, line) => {
      const [key, value] = line.split(/\s*->\s*/);
      acc[key] = value;
      return acc;
    }, {});

    // iterate N times
    for (let i = 0; i < iterations.value; i++) {
      axiom = step(axiom)
    }

    console.log(axiom);

    // init data for displaying in 3D
    let pos = new THREE.Vector3(0, 0, 0);
    let angle = 0;
    const stack: Array<SaveData> = [];

    if (axiom.length <= 1) {
      return;
    }

    for (const symbol of axiom) {
      switch (symbol) {
        case "0":
        case "1":
        case "F":
        case "f":
        case "G":
        case "g":
        case "h":
        case "H":
          // observer the new position
          const movedPos = new THREE.Vector3(
            pos.x + Math.sin(angle) * scale.value,
            pos.y + Math.cos(angle) * scale.value,
          )

          // material loading
          const material = new THREE.LineBasicMaterial( { color: "white"} );
          const geometry = new THREE.BufferGeometry().setFromPoints( [pos, movedPos] );
          const line = new THREE.Line( geometry, material );
          scene.add( line );
          deletables.push(line);

          // replace old pos with the new one
          pos = movedPos;
          break;
        
        // rotate left and right
        case "+":
        case "l":
          angle -= angleRadians.value;
          break;
        case "-":
        case "r":
          angle += angleRadians.value;
          break;

        // save and pop state
        case "[":
          stack.push({pos, angle});
          break;
        case "]":
          const popped: SaveData = stack.pop();
          pos = popped.pos;
          angle = popped.angle;
          break;
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

  label {
    font-size: 16px;
    margin-top: 4px;
    margin-bottom: 4px;
  }

  textarea {
    resize: vertical;
  }

  input[type="text"] {
    width: 120px;
  }

  input[type="range"] {
    margin-bottom: 18px;
  }

</style>
