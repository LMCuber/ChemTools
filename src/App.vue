
<template>
  
  <div id="main">
    <div id="main-grid">
      
      <Sidebar v-model:currentWidget="currentWidget"></Sidebar>
      <keep-alive>
        <component 
            :is="widgets[currentWidget]" 
            :active="true"
        />
      </keep-alive>
            
    </div>
  </div>

</template>

<script setup lang="ts">

  import { ref, Ref } from "vue";
  import type { Component } from "vue";
  import ChemTools from "./components/ChemTools.vue";
  import LSystem from "./components/LSystem.vue";
  import Sidebar from "./components/Sidebar.vue";
  import Terrain from "./components/Terrain.vue";

  const widgets: Array<Component> = [ChemTools, LSystem, Terrain];
  const currentWidget: Ref<number> = ref(0);

</script>

<style scoped>

  #main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }

  #main-grid {
    display: grid;
    grid-template-columns: var(--toolbar-width) 1fr;
  }

</style>