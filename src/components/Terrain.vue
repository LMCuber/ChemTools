
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
  import { EdgeVertexIndices, EdgeMasks, TriangleTable } from "../utils/marching_cubes";

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

  type Vec3 = [number, number, number];
  
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

  function generateTerrain(): void {
    function getSafe(x: number, y: number, z: number): number {
      return field?.[x]?.[y]?.[z] ?? null;
    }

    function offsetToPos(x: number, y: number, z: number): Vec3 {
      const m = 0.5;
      return [x * m, y * m, -z * m];
    }

    function indexToOffset(i: number): Vec3 {
      let nx: number = (i & 1) >> 0
      let ny: number = (i & 2) >> 1
      let nz: number = ((i & 4) >> 2)
      return [nx, ny, nz];
    }

    function indicesToInterpolatedPos(indices: [number, number]): number[] {
      const [x1, y1, z1] = offsetToPos(...indexToOffset(indices[0]));
      const [x2, y2, z2] = offsetToPos(...indexToOffset(indices[1]));
      return [
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        (z1 + z2) / 2,
      ]
    }

    let field: number[][][] = [];

    // first delete the previous terrain
    for (const del of deletables) {
      scene.remove(del);
    }
    deletables.length = 0;

    const sphereGeometry = new THREE.SphereGeometry(0.05, 64, 64);
    
    reseed(Math.random());
    const n = 12;
    const freq = 0.12;

    for (let x = 0; x < n; x++) {
      field.push([]);

      for (let y = 0; y < n; y++) {
        field[x].push([])

        for (let z = 0; z < n; z++) {
          let height = (octaveNoise(x * freq, y * freq, z * freq) + 1) / 2;

          if (height <= 0.5) {
            height = 0;
          } else {
            height = 1;
          }

          field[x][y].push(height);

          const sphereMaterial = new THREE.MeshPhongMaterial({
                          color: new THREE.Color(height, height, height),
                          shininess: 50,
                          specular: 0x333333,
                      });

          const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
          mesh.position.set(...offsetToPos(x, y, z));
          // scene.add(mesh);
          // deletables.push(mesh);
        }
      }
    }

    console.log(field)

    const meshMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.9, 0.9, 0.9),
      side: THREE.DoubleSide,
      shininess: 50,
      specular: 0x333333,
    });

    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {
          let cubeIndex = 0;

          for (let i = 0; i < 8; i++) {
            let [nx, ny, nz]: Vec3 = indexToOffset(i);
            if (getSafe(x + nx, y + ny, z + nz)) {
              cubeIndex = cubeIndex | (1 << i);
            }
          }
          if (cubeIndex) {
            const edgeMask: number = EdgeMasks[cubeIndex];
            const vertexIndicesMap: Record<number, number[]> = [...Array(12).keys()]
              .filter(i => edgeMask & (1 << i))
              .reduce((acc, i) => {
                acc[i] = EdgeVertexIndices[i];
                return acc;
              }, {} as Record<number, number[]>);
            const vertexPositionMap: Record<number, ReturnType<typeof indicesToInterpolatedPos>> =
              Object.fromEntries(
                Object.entries(vertexIndicesMap).map(([key, value]) => [
                  key,
                  indicesToInterpolatedPos(value)
                ])
              );
            const finalVertices = TriangleTable[cubeIndex].filter(edgeIndex => edgeIndex !== -1).map(edgeIndex => vertexPositionMap[edgeIndex]);

            const [offsetX, offsetY, offsetZ] = offsetToPos(x, y, z);
            const offsetVertices = finalVertices.map(([vx, vy, vz]) => [
              vx + offsetX,
              vy + offsetY,
              vz + offsetZ
            ]);
            const arrayVertices = new Float32Array(offsetVertices.flat());

            const meshGeometry = new THREE.BufferGeometry();
            meshGeometry.setAttribute("position", new THREE.BufferAttribute(arrayVertices, 3));
            meshGeometry.computeVertexNormals();
            const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
            scene.add(mesh);
            deletables.push(mesh);
          }
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
