<template>
  <div class="vue-button-demo">
    <VueButton :variant="variant" :size="size" :disabled="disabled" @click="onClick">
      {{ label }}
    </VueButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import VueButton from '../VueButton.vue';

defineProps<{
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

const onClick = () => {
  emit('click');
};
</script>
