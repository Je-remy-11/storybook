import type { Plugin } from 'vite';

export const getVueVitePlugins = async (): Promise<Plugin[]> => {
  try {
    const { templateCompilation } = await import('../frameworks/vue3-vite/src/plugins/vue-template.ts');
    const vuePlugin = (await import('@vitejs/plugin-vue')).default;
    
    return [
      vuePlugin(),
      await templateCompilation(),
    ];
  } catch (error) {
    console.warn('Vue 3 插件加载失败，Vue 组件可能无法正常工作:', error);
    return [];
  }
};

export const getVueStorybookPlugin = async (): Promise<Plugin[]> => {
  try {
    const { storybookVuePlugin } = await import('../frameworks/vue3-vite/src/vite-plugin.ts');
    return await storybookVuePlugin();
  } catch (error) {
    console.warn('Storybook Vue 插件加载失败:', error);
    return [];
  }
};
