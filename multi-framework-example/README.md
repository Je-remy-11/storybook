# Multi-Framework Storybook: React + Vue 3

## Overview

This configuration allows a single Storybook instance to serve both React and Vue 3 stories simultaneously.

## Files Modified/Created

### 1. `.storybook/main.ts`

Key changes:

- **framework**: Remains `@storybook/react-vite` as the primary framework
- **stories**: Added a new glob pattern for Vue stories
- **viteFinal**: Added `@vitejs/plugin-vue` alongside the existing React plugin

### 2. `.storybook/preview.ts`

- Imports `@storybook/vue3` to enable Vue 3 story rendering
- Configures shared parameters for both frameworks

### 3. `vue-components/src/`

- Contains Vue components and their stories
- Stories use `@storybook/vue3-vite` types

## Conflict Points and Solutions

### 1. Framework Selection

**Conflict**: Storybook only supports one primary `framework` in `main.ts`.

**Solution**: Use `@storybook/react-vite` as the primary framework and manually add the Vue Vite plugin in `viteFinal`. The Vite bundler can handle both `.jsx/.tsx` and `.vue` files when both plugins are registered.

### 2. Vite Plugin Order

**Conflict**: Plugin order matters. React plugin should process React files first, Vue plugin should process Vue files.

**Solution**: Register both plugins in `viteFinal`. Vite's plugin system routes files based on extensions:
- `@vitejs/plugin-react` handles `.jsx`, `.tsx`
- `@vitejs/plugin-vue` handles `.vue`

```ts
viteFinal: async (config) => {
  return mergeConfig(config, {
    plugins: [react(), vue()],
  });
}
```

### 3. Story Glob Patterns

**Conflict**: React and Vue stories might overlap if glob patterns are too broad.

**Solution**: Use separate, explicit glob patterns:

```ts
stories: [
  // React stories
  '../src/**/*.stories.@(js|jsx|ts|tsx)',
  // Vue stories
  {
    directory: '../vue-components/src',
    titlePrefix: 'Vue Components',
    files: '**/*.stories.@(js|ts)',
  },
]
```

### 4. TypeScript Configuration

**Conflict**: Vue SFC imports require TypeScript shims.

**Solution**: Add Vue type declarations to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "vue-components/src/**/*.vue"]
}
```

Create `vue-components/src/env.d.ts`:

```ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
```

### 5. Docgen and Props Tables

**Conflict**: React uses `react-docgen` for props extraction. Vue uses `vue-component-meta` or `vue-docgen-api`.

**Solution**: The `@storybook/vue3-vite` framework includes its own docgen setup. When using React as the primary framework, Vue props tables may not auto-generate. To enable Vue docgen:

1. Install `vue-component-meta` as a dev dependency
2. Configure in `preview.ts` if needed

### 6. Preview Annotations

**Conflict**: React and Vue may need different preview setups.

**Solution**: Use conditional logic in `preview.ts` or framework-specific preview files if needed.

### 7. CSS Conflicts

**Conflict**: React and Vue components might have conflicting global styles.

**Solution**: Use CSS modules or scoped styles in Vue components. Keep global styles minimal.

## Required Dependencies

```bash
yarn add -D @storybook/vue3-vite @vitejs/plugin-vue vue
```

## Verification

1. Start Storybook: `yarn storybook`
2. Verify React stories still render correctly
3. Navigate to "Vue Components" section in the sidebar
4. Verify Vue stories render with props tables

## Limitations

- Only one framework can be the "primary" framework
- Some framework-specific addons may only work with the primary framework
- Inline story rendering in docs may favor the primary framework
- Test runner may need framework-specific configuration
