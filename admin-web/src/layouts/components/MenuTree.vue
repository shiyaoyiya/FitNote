<template>
  <template v-for="m in list" :key="m.id">
    <el-sub-menu
      v-if="m.children && m.children.length && m.type === 1"
      :index="m.path || String(m.id)"
    >
      <template #title>
        <el-icon v-if="m.icon"><component :is="m.icon" /></el-icon>
        <span>{{ m.title }}</span>
      </template>
      <MenuTree :list="m.children" />
    </el-sub-menu>
    <el-menu-item
      v-else-if="m.type === 2"
      :index="m.path"
    >
      <el-icon v-if="m.icon"><component :is="m.icon" /></el-icon>
      <template #title>{{ m.title }}</template>
    </el-menu-item>
  </template>
</template>

<script setup>
defineProps({
  list: { type: Array, required: true }
})
</script>
