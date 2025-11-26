
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
    pointLight.position.set(0, 12, 0);
    pointLight.intensity = 300;
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
      return [x * tileWidth, y * tileWidth, -z * tileWidth];
    }

    function centerPos(v: Vec3): Vec3 {
      return [v[0] - ((numTiles - 1) * tileWidth / 2), v[1] - ((terrainHeight - 1) * tileWidth / 2), v[2] + ((numTiles - 1) * tileWidth / 2)]
    }

    function indexToOffset(i: number): Vec3 {
      let nx: number = (i & 1) >> 0
      let ny: number = (i & 2) >> 1
      let nz: number = ((i & 4) >> 2)
      return [nx, ny, nz];
    }

    function indicesToInterpolatedPos(x: number, y: number, z: number, indices: [number, number]): number[] {
      const [x1, y1, z1] = offsetToPos(...indexToOffset(indices[0]));
      const [x2, y2, z2] = offsetToPos(...indexToOffset(indices[1]));
      return [
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        (z1 + z2) / 2,
      ]
    }

    function hexToRGB(hex: string): [number, number, number] {
        if (hex.startsWith("#")) {
          hex = hex.slice(1);
        }
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        return [r, g, b];
    }

    for (const del of deletables) {
      scene.remove(del);
    }
    deletables.length = 0;

    let field: number[][][] = [];
    
    reseed(Math.random());
    const numTiles = 200;
    const terrainHeight = 50;
    const tileWidth = 0.25;
    const freq = 0.015;

    const sphereGeometry = new THREE.SphereGeometry(0.05, 64, 64);
    for (let x = 0; x < numTiles; x++) {
      field.push([]);

      for (let y = 0; y < terrainHeight; y++) {
        field[x].push([])

        for (let z = 0; z < numTiles; z++) {
          let height = (octaveNoise(x * freq, 0, z * freq, 3) + 1) / 2;
          if (y / terrainHeight <= height) {
            height = 1
          } else {
            height = 0;
          }

          field[x][y].push(height);

          if (height === 0) {
            continue;
          }

          const sphereMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(height, height, height),
            shininess: 50,
            specular: 0x333333,
          });

          const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
          mesh.position.set(...centerPos(offsetToPos(x, y, z)));
          // scene.add(mesh);
          // deletables.push(mesh);
        }
      }
    }

    let totalVertices = []
    let colors = [];

    // const terrainColors: Map<number, string> = new Map([
    //   [0.28,  "#1F244B"],
    //   [0.4,   "#d1a67e"],
    //   [0.45,  "#f6e79c"],
    //   [0.5,  "#b6cf8e"],
    //   [0.6,  "#60ae7b"],
    //   [0.75, "#3c6b64"],
    //   [1,    "#654053"],
    // ])

    const terrainColors: Map<number, string> = new Map([
      [0.3,  "#4b726e"],
      [0.35,   "#8caba1"],
      [0.4,  "#d2c9a5"],
      [0.45,  "#d1b187"],
      [0.5, "#ba9158"],
      [0.55, "#b3a555"],
      [0.7, "#77743b"],
      [0.75, "#4d4539"],
      [1, "#ab9b8e"],
    ])

    for (let x = 0; x < numTiles; x++) {
      for (let y = 0; y < terrainHeight; y++) {
        for (let z = 0; z < numTiles; z++) {
          let cubeIndex = 0;

          for (let i = 0; i < 8; i++) {
            let [nx, ny, nz]: Vec3 = indexToOffset(i);
            if (getSafe(x + nx, y + ny, z + nz) >= 0.5) {
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
                  indicesToInterpolatedPos(x, y, z, value)
                ])
              );
            const finalVertices = TriangleTable[cubeIndex].filter(edgeIndex => edgeIndex !== -1).map(edgeIndex => vertexPositionMap[edgeIndex]);
      
            const [offsetX, offsetY, offsetZ] = offsetToPos(x, y, z);
            const offsetVertices = finalVertices.map(([vx, vy, vz]) => [
              vx + offsetX,
              vy + offsetY,
              vz + offsetZ
            ]);
            totalVertices.push(...offsetVertices);

            const height = (octaveNoise(x * freq, 0, z * freq, 3) + 1) / 2;
            for (let i = 0; i < offsetVertices.length; i++) {
              let color = terrainColors["1"];
              for (const [h, c] of terrainColors.entries()) {
                if (height <= h) {
                  color = c;
                  break;
                }
              }
              colors.push(color);
            }
          }
        }
      }
    }

    const meshMaterial = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 50,
      specular: 0x333333,
    });
    const arrayVertices = new Float32Array(totalVertices.flat());
    const meshGeometry = new THREE.BufferGeometry();
    meshGeometry.setAttribute("position", new THREE.BufferAttribute(arrayVertices, 3));
    meshGeometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors.map(c => hexToRGB(c)).flat()), 3))
    meshGeometry.computeVertexNormals();
    const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
    mesh.position.set(...centerPos([0, 0, 0]))
    scene.add(mesh);
    deletables.push(mesh);
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
