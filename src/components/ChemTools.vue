
<template>
  <!-- grid for the settings and canvas -->
  <div id="grid">
      <!-- settings bar containing the buttons and checks -->
      <div ref="settingsBar" class="settings border">
          <input ref="inputBox" type="text" v-model="compoundName" @keyup.enter="displayModel">
          <Recenter v-if="controls" :controls="controls"></Recenter>
          <hr>

          <label class="settings-label">
              <input type="checkbox" v-model="tooltips" class="checkbox" />
              <span>Tooltips</span>
          </label>
          <hr>
          <label class="settings-label">
              <input type="checkbox" v-model="gridlines" @change="toggleGridlines"/>
              <span>Gridlines</span>
          </label>

      </div>

      <canvas id="canvas" class="border" @mouseup="inputBox.focus()" @mousemove="raycastForTooltip"></canvas>

    </div>

</template>

<script setup lang="ts">
  import { onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, Ref, ref, useTemplateRef } from "vue"
  import * as THREE from "three"
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { getCSSVar } from "../utils/commons";
  import Recenter from "./Recenter.vue";

  const chemUrl: string = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{}/SDF?record_type=3d";
  const compoundName: Ref<string> = ref("methane");
  const canvas = reactive({
    width: getCSSVar("--canvas-width"),
    height: getCSSVar("--canvas-height"),
  })
  const tooltips = ref(true);
  const gridlines = ref(true);
  let lastRequest: number = Date.now();

  // lifecycle
  const active: Ref<boolean> = ref(false);
  let frameId: number = 0;

  // template refs
  const inputBox = useTemplateRef("inputBox");
  const settingsBar = useTemplateRef("settingsBar");

  // 3D rendering
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let renderer: THREE.WebGLRenderer;
  let pointLight: THREE.PointLight;
  const gridHelper = new THREE.GridHelper(200, 50);
  let controls: Ref<OrbitControls | null> = ref(null);
  //
  let lastUpdate: number = performance.now();
  let deletables: (AtomMesh | BondMesh)[] = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // atom stuff
  interface Atom {
    x: number,
    y: number,
    z: number,
    name: string,
  }
  
  interface Bond {
    a: number,
    b: number,
    type: number;
  }

  class AtomMesh {
    mesh: THREE.Mesh;
    atom: Atom;

    constructor(mesh: THREE.Mesh, atom: Atom) {
      this.mesh = mesh;
      this.atom = atom;
    }
  }

  class BondMesh {
    mesh: THREE.Mesh;
    bond: Bond;

    constructor(mesh: THREE.Mesh, bond: Bond) {
      this.mesh = mesh;
      this.bond = bond;
    }
  }

  // radius in picometers
  const atomData = {
    // basic
    "C": {color: 0x232323, radius: 77},
    "H": {color: 0xFFFFFF, radius: 53},
    "O": {color: "red", radius: 60},
    "N": {color: "blue", radius: 53},
    // halogens
    "F": {color: "#d7d959", radius: 71},
    "Cl": {color: "#90EE90", radius: 99},
    // other
    "S": {color: "yellow", radius: 100},
    "P": {color: "orange", radius: 110},
  }

  async function displayModel() {
    lastRequest = Date.now();
    const url: string = chemUrl.replace("{}", compoundName.value);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const sdf = await response.text();
      parseSDF(sdf);
    } catch(error) {
      console.log(`Error fetching SDF: ${error}`)
    }
  }

  function parseSDF(sdf: string): void {
    const parseLine = (line: string) => line.trim().split(" ").filter((x) => x !== "");

    // global variables
    let numAtoms: number = 0;
    let numBonds: number = 0;
    let atoms: Atom[] = [];
    let bonds: Bond[] = [];
    // parse liens of the SDF
    for (const [i, line] of sdf.split("\n").entries()) {
      // first three lines are metadata
      if (i < 3) {
        continue;
      }

      // line 3 is global number of atoms and bonds
      if (i == 3) {
        const data = parseLine(line);
        numAtoms = parseInt(data[0]);
        numBonds = parseInt(data[1]);
      }

      // process numAtoms
      if (i > 3 && i < 3 + numAtoms + 1) {
        const data = parseLine(line);
        const x: number = parseFloat(data[0]);
        const y: number = parseFloat(data[1]);
        const z: number = parseFloat(data[2]);
        const name: string = data[3]
        atoms.push({x: x, y: y, z: z, name: name})
      }

      // process numBonds
      if (i > 3 + numAtoms && i < 3 + numAtoms + numBonds + 1) {
        const data = parseLine(line).map((x) => parseInt(x));
        // -1 because SDF indexing starts at 1
        const a: number = data[0] - 1;
        const b: number = data[1] - 1;
        const bondType: number = data[2];
        bonds.push({a: a, b: b, type: bondType})
      }
    }

    // scale the atoms up according to the Model size
    const scale: number = 1
    const radiusScale: number = 0.004
    camera.position.setZ(4);
    for (const atom of atoms) {
      atom.x *= scale;
      atom.y *= scale;
      atom.z *= scale;
    }

    // first remove all previous atoms
    for (const del of deletables) {
      scene.remove(del.mesh);
    }

    deletables.length = 0;
    // generate atomic meshes
    for (const atom of atoms) {
      const geometry = new THREE.SphereGeometry(atomData[atom.name]["radius"] * radiusScale, 64, 64);
      
      const ph_material = new THREE.MeshPhongMaterial({ 
                      color: atomData[atom.name]["color"],
                      shininess: 50,
                      specular: 0x333333,
                  });

      const mesh = new THREE.Mesh(geometry, ph_material);
      mesh.position.set(atom.x, atom.y, atom.z);
      scene.add(mesh);
      deletables.push(new AtomMesh(mesh, atom));
    }

    // generate bond mesh
    for (const bond of bonds) {
      // constants
      const a: Atom = atoms[bond.a];
      const b: Atom = atoms[bond.b];

      getBondMeshes(a, b, bond.type).forEach((mesh) => {
        scene.add(mesh);
        deletables.push(new BondMesh(mesh, bond));
      })
    }
    
    // finishing touches
    controls.value.saveState();

    // response time
    console.log(`Refresh time: ${Date.now() - lastRequest} ms`, );
  }

  function getBondMeshes(a: Atom, b: Atom, n: number, spacing = 0.12): THREE.Mesh[] {
    const start = new THREE.Vector3(a.x, a.y, a.z);
    const end = new THREE.Vector3(b.x, b.y, b.z);
    const axis = new THREE.Vector3().subVectors(end, start).normalize();

    // Choose a helper vector not parallel to axis
    let temp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(axis.dot(temp)) > 0.99) temp.set(1, 0, 0);

    // Find a perpendicular base vector
    const perp1 = new THREE.Vector3().crossVectors(axis, temp).normalize();
    const perp2 = new THREE.Vector3().crossVectors(axis, perp1).normalize(); // 90° to perp1

    const meshes = [];

    if (n === 1) {
      // Single bond (centered)
      meshes.push(getCylinderMesh(start, end));
    } else {
      const angleStep = (2 * Math.PI) / n;

      for (let i = 0; i < n; i++) {
        // Place cylinders in a circle around the axis
        const angle = angleStep * i;

        // Offset = perp1 * cos + perp2 * sin
        const offset = new THREE.Vector3()
            .addScaledVector(perp1, Math.cos(angle))
            .addScaledVector(perp2, Math.sin(angle))
            .multiplyScalar(spacing);

        const startOffset = start.clone().add(offset);
        const endOffset = end.clone().add(offset);

        meshes.push(getCylinderMesh(startOffset, endOffset));
      }
    }
    // Add all bond meshes to the scene
    return meshes;
  }

  function getCylinderMesh(pointX: THREE.Vector3, pointY: THREE.Vector3): THREE.Mesh {
    /* 
    from: https://stackoverflow.com/questions/15316127/three-js-line-vector-to-cylinder
    */
    const direction = new THREE.Vector3().subVectors(pointY, pointX);
    const orientation = new THREE.Matrix4();
    orientation.lookAt(pointX, pointY, new THREE.Object3D().up);
    orientation.multiply(new THREE.Matrix4().set(1, 0, 0, 0,
      0, 0, 1, 0,
      0, -1, 0, 0,
      0, 0, 0, 1)
    );
    const edgeGeometry = new THREE.CylinderGeometry(0.06, 0.06, direction.length(), 16, 16);
    const edge = new THREE.Mesh(edgeGeometry, new THREE.MeshStandardMaterial({ color: "lightgray" }));
    edge.applyMatrix4(orientation);
    // position based on midpoints - there may be a better solution than this
    edge.position.x = (pointY.x + pointX.x) / 2;
    edge.position.y = (pointY.y + pointX.y) / 2;
    edge.position.z = (pointY.z + pointX.z) / 2;
    return edge;
  }

  function raycastForTooltip(event: any): void {
    if (!tooltips.value) {
      return;
    }

    const rect = renderer.domElement.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    // Get intersects with the spheres
    const intersects = raycaster.intersectObjects(deletables.filter((x) => x instanceof AtomMesh).map((x) => x.mesh));
    
    // set the default colors
    for (const del of deletables) {
      if (del instanceof AtomMesh) {
        const atom = del.atom;
        const mesh = del.mesh as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.color.set(atomData[atom.name]["color"]);
      }
    }

    // set the intersected colors a different color
    for (const inter of intersects) {
      const mesh = inter.object as THREE.Mesh;
      (mesh.material as THREE.MeshStandardMaterial).color.set("pink");
    }
  }

  function toggleGridlines(): void {
    if (!gridlines.value) {
      scene.remove(gridHelper);
    } else {
      scene.add(gridHelper)
    }
  }

  onMounted(() => {
    // template ref
    inputBox.value.focus();
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

    // lighting
    const ambient = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambient);
    pointLight = new THREE.PointLight(0xFFFFFF);
    pointLight.position.set(0, 0, 0);
    pointLight.intensity = 30;
    scene.add(pointLight);
    const plHelper = new THREE.PointLightHelper(pointLight);
    scene.add(plHelper);

    // gridlines and controls
    scene.add(gridHelper);
    controls.value = new OrbitControls(camera, renderer.domElement);

    // start the recursion!
    animate();
  })

  function animate() {
    // goofy lighting
    const r: number = 3;
    pointLight.position.set(0, r * Math.sin(Date.now() * 0.001), r * Math.cos(Date.now() * 0.001),);

    requestAnimationFrame(animate);

    // update the controls
    controls.value.update();

    // render the scene
    renderer.render(scene, camera);
  }

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

</script>

<style scoped>
  #grid {
    display: grid;
    grid-template-columns: var(--settings-width) 1fr;
  }

</style>
