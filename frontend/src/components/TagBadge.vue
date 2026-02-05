<template>
  <span class="tag-badge">{{ tag.name }}</span>
</template>

<script setup lang="ts">
import type { Tag } from '../types'

defineProps<{
  tag: Tag
}>()
</script>

<style scoped>
.tag-badge {
  display: inline-block;
  padding: 2px 8px;
  background-color: var(--tag-bg);
  color: var(--tag-text);
  border-radius: 4px;
  font-size: 0.85em;
  margin-right: 4px;
}
</style>
