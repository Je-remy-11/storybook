import type { Plugin } from 'vite';

/**
 * 获取 Vue 3 所需的 Vite 基础插件
 *
 * 注意：在同时包含 React 的项目中，必须显式禁用 Vue 插件的 JSX 处理，
 * 否则 @vitejs/plugin-vue 会注册它自己的 JSX 转换器，
 * 与 @vitejs/plugin-react 冲突，导致 React 的 .tsx 文件被错误地
 * 当作 Vue JSX 处理（反之亦然）。
 */
export const getVueVitePlugins = async (): Promise<Plugin[]> => {
  try {
    const { templateCompilation } = await import(
      '../frameworks/vue3-vite/src/plugins/vue-template.ts'
    );
    const vuePlugin = (await import('@vitejs/plugin-vue')).default;

    return [
      // 关键：传入 jsx: false，禁用 Vue 自己的 JSX 转换
      // 让 React 插件独占 .tsx/.jsx 文件的处理
      vuePlugin({
        jsx: false,
        template: {
          compilerOptions: {
            // 允许 Vue 模板中使用 @click 等常见指令
            isCustomElement: (tag) => tag.startsWith('sb-'),
          },
        },
      }),
      // Storybook 内部的 Vue 模板编译插件（用于 .vue SFC 的 story 注解处理）
      await templateCompilation(),
    ];
  } catch (error) {
    console.warn('Vue 3 插件加载失败，Vue 组件可能无法正常工作:', error);
    return [];
  }
};

/**
 * 获取 Storybook 框架专用的 Vue 插件
 *
 * 这些插件包含：docgen 信息提取、story 参数解析等。
 * 它们被设计为与 @storybook/vue3-vite 的 preset 一起工作，
 * 这里单独提取出来以便在主框架为 @storybook/react-vite 时复用。
 */
export const getVueStorybookPlugin = async (): Promise<Plugin[]> => {
  try {
    const { storybookVuePlugin } = await import('../frameworks/vue3-vite/src/vite-plugin.ts');
    return await storybookVuePlugin();
  } catch (error) {
    console.warn('Storybook Vue 插件加载失败:', error);
    return [];
  }
};
