<template>
    <div id="sidebar" class="settings border">
        <button @click="changeCurrentWidget(0)" :class="{ 'selected': props.currentWidget === 0 }" title="Chemical Compound Viewer">⚛</button>
        <hr>
        <button @click="changeCurrentWidget(1)" :class="{ 'selected': props.currentWidget === 1 }" title="L-System Visualiser">✾</button>
        <hr>
        <button @click="changeCurrentWidget(2)" :class="{ 'selected': props.currentWidget === 2 }" title="Terrain">※</button>
    </div>
</template>

<script setup lang="ts">

const props = defineProps<{ currentWidget: number }>()
const emit = defineEmits<{ (e: "update:currentWidget", id: number): void }>()

function changeCurrentWidget(id: number) {
  emit("update:currentWidget", id)
}

</script>

<style scoped>

#sidebar {
    button {
        font-size: 40px;
        height: 60px;
    }

    .selected {
        background-color: var(--palette-highlight);
    }
}

</style>