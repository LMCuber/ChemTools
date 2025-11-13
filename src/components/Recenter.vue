<template>

  <button @click="controls.reset()">Recenter</button>

</template>

<script setup>
  defineProps({
      controls: Object,
  });

</script>