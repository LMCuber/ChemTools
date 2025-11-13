
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

  const widgets: Array<Component> = [ChemTools, LSystem];
  const currentWidget: Ref<number> = ref(0);

</script>

<style scoped>

  #main {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  #main-grid {
    display: grid;
    grid-template-columns: 10% 85%;
  }

</style>