<template>
  <div class="vue-card">
    <div v-if="$slots.header" class="vue-card__header">
      <slot name="header" />
    </div>
    <div class="vue-card__content">
      <slot />
    </div>
    <div v-if="$slots.footer" class="vue-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Card 组件是一个简单的容器组件，支持三个插槽：header、默认内容和 footer
</script>

<style scoped>
.vue-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.vue-card__header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  font-size: 16px;
}

.vue-card__content {
  padding: 16px;
}

.vue-card__footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background-color: #fafafa;
}
</style>
