<template>
  <button :class="['vue-button', `vue-button--${type}`, { 'vue-button--disabled': disabled }]" @click="handleClick">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

interface Props {
  type?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  disabled: false,
});

const emit = defineEmits<{
  click: [];
}>();

const handleClick = () => {
  if (!props.disabled) {
    emit('click');
  }
};
</script>

<style scoped>
.vue-button {
  padding: 8px 16px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.vue-button--primary {
  background-color: #1e88e5;
  color: white;
}

.vue-button--primary:hover:not(.vue-button--disabled) {
  background-color: #1976d2;
}

.vue-button--secondary {
  background-color: #e3f2fd;
  color: #1e88e5;
}

.vue-button--secondary:hover:not(.vue-button--disabled) {
  background-color: #bbdefb;
}

.vue-button--danger {
  background-color: #e53935;
  color: white;
}

.vue-button--danger:hover:not(.vue-button--disabled) {
  background-color: #c62828;
}

.vue-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
