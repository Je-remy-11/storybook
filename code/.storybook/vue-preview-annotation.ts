import React, { useEffect, useRef } from 'react';
import type { DecoratorFunction, Renderer } from 'storybook/internal/types';

/**
 * Vue 3 preview 注解 — 在同一个 Storybook 实例中同时支持 React 和 Vue 3 组件
 *
 * ===== 核心挑战：主框架为 @storybook/react-vite =====
 * Storybook 的 `framework` 是单例配置，无法同时声明 `@storybook/react-vite`
 * 和 `@storybook/vue3-vite`。当前主框架为 react-vite，所以 preview bundle
 * 默认使用 React 渲染器，Vue story 直接运行会报：
 *   "Cannot read properties of undefined (reading 'render')"
 *
 * ===== 本方案：React-Vue 桥接装饰器 =====
 * 不是尝试让 Storybook 同时加载两个渲染器（官方不支持），
 * 而是把 Vue 组件包装成一个 React 组件：
 *
 *   ┌──────────────────────────────────────────┐
 *   │  Storybook (React renderer)              │
 *   │    ┌─ React wrapper component ───────┐   │
 *   │    │   useEffect → createApp()       │   │
 *   │    │   cleanup → app.unmount()       │   │
 *   │    └─────────────────────────────────┘   │
 *   │        │↑│  Vue 3 组件树                 │
 *   └────────┴─┴───────────────────────────────┘
 *
 * ===== 另一个已被拒绝的方案 =====
 * 尝试使用 `parameters.framework: 'vue3'` 在 Storybook 10.x 中切换渲染器：
 * 该 API 目前是实验性的，且当主框架为 react-vite 时并不会真正加载
 * Vue 渲染器。所以桥接方案是目前生产环境最可靠的选择。
 */

/** 动态 import 的 Vue 运行时缓存（避免重复加载） */
let vueRuntime: {
  createApp: (...args: unknown[]) => { mount: (el: unknown) => void; unmount: () => void };
  h: (...args: unknown[]) => unknown;
} | null = null;

/** 懒加载 Vue 运行时 — 只有在第一次遇到 Vue story 时才执行 */
const loadVueRuntime = async () => {
  if (vueRuntime) return vueRuntime;
  try {
    const vue = await import('vue');
    vueRuntime = {
      createApp: vue.createApp,
      h: vue.h,
    };
    return vueRuntime;
  } catch (error) {
    console.warn(
      '[vue-preview] Vue 运行时加载失败。请确认 package.json 中已安装 vue 和 @storybook/vue3-vite：',
      error
    );
    return null;
  }
};

/**
 * 将 Vue story 包装成 React 组件
 *
 * Vue story 的"渲染结果"可能是以下形式之一：
 *   1. 直接返回 Vue 组件对象（{ setup, template }）
 *   2. 返回 h('div', ...) 虚拟节点
 *   3. 返回一个 Vue 组件定义（已被 Storybook Vue 渲染器规范化）
 *
 * 我们统一用 createApp 挂载到一个 React 管理的 DOM 节点上。
 */
const VueComponentBridge: React.FC<{
  vueComponent: unknown;
  vueArgs: Record<string, unknown>;
  vueSlots?: Record<string, unknown>;
}> = ({ vueComponent, vueArgs, vueSlots }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<{ unmount: () => void } | null>(null);

  useEffect(() => {
    let disposed = false;

    (async () => {
      const vue = await loadVueRuntime();
      if (!vue || disposed || !containerRef.current) return;

      // 销毁旧实例（热更新场景）
      if (appRef.current) {
        appRef.current.unmount();
        appRef.current = null;
      }

      // 用 Vue 的 createApp 挂载用户的 Vue 组件
      // 对常见的两种形式都做兼容处理：
      //   a) 直接是组件定义对象 { setup, render, ... }
      //   b) 已经是 VNode (h(Component, props))
      const app = vue.createApp({
        name: 'StorybookVueBridge',
        render() {
          // 如果传入的是组件定义，就包一层 h() 传入 args
          if (typeof vueComponent === 'object' && vueComponent !== null) {
            // 检查是否已经是 VNode（有 __v_isVNode 标识）
            const isVNode =
              (vueComponent as { __v_isVNode?: boolean }).__v_isVNode === true ||
              (vueComponent as { type?: unknown }).type !== undefined;
            if (isVNode) {
              return vueComponent as ReturnType<typeof vue.h>;
            }
            return vue.h(vueComponent as never, vueArgs, vueSlots);
          }
          // 如果只是一个函数（setup 返回）
          if (typeof vueComponent === 'function') {
            return vue.h(vueComponent as never, vueArgs, vueSlots);
          }
          return vue.h('div', { style: { padding: '8px' } }, 'Unsupported Vue story format');
        },
      });

      app.mount(containerRef.current);
      appRef.current = app;
    })();

    return () => {
      disposed = true;
      if (appRef.current) {
        appRef.current.unmount();
        appRef.current = null;
      }
    };
    // 依赖列表：vueComponent 引用、args、slots 变更时重新挂载
  }, [vueComponent, JSON.stringify(vueArgs), JSON.stringify(vueSlots)]);

  return <div ref={containerRef} data-sb-vue-bridge />;
};

/**
 * 判断一个 story 是否是 Vue story
 *
 * 启发式规则（按优先级）：
 *   1. context.title 以 'Vue/' 开头（由 main.ts 的 titlePrefix 设置）
 *   2. context.parameters.framework === 'vue3'（用户显式声明）
 *   3. context.component 看起来像一个 Vue 组件定义（有 setup / render 方法）
 */
const isVueStory = (context: {
  title?: string;
  parameters?: { framework?: string; [key: string]: unknown };
  component?: unknown;
}): boolean => {
  if (context?.parameters?.framework === 'vue3') return true;
  if (context?.title?.startsWith('Vue/')) return true;
  const component = context?.component;
  if (component && typeof component === 'object') {
    const c = component as { setup?: unknown; render?: unknown; template?: unknown };
    if ('setup' in c || 'template' in c || 'render' in c) return true;
  }
  return false;
};

/**
 * 主装饰器：拦截 Vue story 并用 React-Vue 桥接组件渲染
 *
 * 对于 React story（默认）：直接透传，不做任何处理
 * 对于 Vue story：提取原始的 Vue 渲染结果，用桥接组件包装后返回
 */
const withVueBridge: DecoratorFunction<Renderer, Record<string, unknown>> = (
  storyFn: () => unknown,
  context: { [key: string]: unknown; originalStoryFn?: unknown; component?: unknown }
) => {
  const ctx = context as {
    title?: string;
    parameters?: { framework?: string; [key: string]: unknown };
    args?: Record<string, unknown>;
    component?: unknown;
    originalStoryFn?: unknown;
    id?: string;
  };

  if (!isVueStory(ctx)) {
    // 非 Vue story — 直接用 React 渲染器渲染
    return storyFn() as React.ReactNode;
  }

  // ===== Vue story 处理 =====
  // Vue story 在 @storybook/vue3-vite 的模板中有两种写法：
  //   A. export default { component: MyVueComponent, title: 'Vue/Button' }
  //      export const Primary = { args: { label: 'Hi' } };
  //
  //   B. const meta = preview.meta({ component: MyVueComponent });
  //      export const Primary = meta.story({ args: { label: 'Hi' } });
  //
  // 在这两种写法中，被 Storybook 编译后传递给 decorator 的 `storyFn()`
  // 调用会返回原始的 Vue 组件/VNode。我们把它包装成 React 桥接组件。

  const vueArgs = (ctx.args ?? {}) as Record<string, unknown>;
  const originalStoryResult = storyFn();

  // 情况 1：storyFn() 返回的已经是一个可以直接传给 createApp 的东西
  // 情况 2：storyFn() 返回的是 React 元素（说明 Vue story 的编译流程走了 React 侧）
  //         此时我们尝试从 ctx.component 里取 Vue 组件定义
  const vueComponent =
    originalStoryResult &&
    typeof originalStoryResult === 'object' &&
    (originalStoryResult as { $$typeof?: unknown }).$$typeof === undefined
      ? originalStoryResult
      : ctx.component;

  return React.createElement(VueComponentBridge, {
    vueComponent,
    vueArgs,
    key: ctx.id ?? ctx.title,
  });
};

// ===== Storybook preview annotations 导出 =====
// 这些导出会被 Storybook 自动收集并应用到所有 story。

export const decorators = [withVueBridge];

export const parameters = {
  // Vue story 在使用 `@storybook/addon-docs` 的自动生成 docs 页时
  // 需要显式声明不使用 React 的 Source 插件渲染。这里先提供默认值，
  // 真正的 Vue story 可以在自己的 meta 中覆盖。
  docs: {
    // 为 Vue story 单独设置 source 渲染器
    source: {
      type: 'dynamic',
    },
  },
};

// ===== 全局 Vue 初始化（可选） =====
// 提供一个 setup 入口，让 Vue story 可以注册全局组件、插件等。
// 由于 Vue 运行时是懒加载的，此处也使用条件 import。

type VueAppSetup = (
  app: { component: (name: string, comp: unknown) => void; use: (plugin: unknown) => void }
) => void;

const globalSetups: VueAppSetup[] = [];

/**
 * Vue story 可以通过以下方式注册全局 setup：
 *   import { setup } from '../../code/.storybook/vue-preview-annotation.ts';
 *   setup((app) => {
 *     app.component('GlobalButton', MyButton);
 *   });
 */
export const setup = (fn: VueAppSetup) => {
  globalSetups.push(fn);
};

// 默认导出 — 供 main.ts 的 previewAnnotations 动态 import 使用
const defaultExport = {
  decorators: [withVueBridge],
  parameters,
};

export default defaultExport;
