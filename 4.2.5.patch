export const ROOT_CAUSE_ANALYSIS = `
Storybook server.watch.ignored 问题 - 根因分析
================================================

问题: 在配置中设置 server.watch.ignored 为 ["**/.nx/cache/**", "**/tsconfig.json"]
      后, 修改 tsconfig.json 仍然会触发 Storybook 完整页面重新加载。

Storybook 存在多层独立的文件监听系统, server.watch.ignored 仅控制其中一层:

监听层 1: Vite chokidar watcher (server.watcher)
  - 受 server.watch.ignored 控制
  - 用于: HMR、模块图更新、change detection adapter
  - 文件: vite-server.ts -> createServer(finalConfig)

监听层 2: Watchpack — .storybook 配置目录监听
  - 仅忽略 ["**/.git", "**/node_modules"]
  - 用于: 检测 main.ts / preview.ts 等配置文件变更
  - 文件: core-server/utils/watchConfig.ts

监听层 3: Watchpack — story 文件目录监听
  - 仅忽略 ["**/.git", "**/node_modules"]
  - 用于: 检测 story 文件的新增/删除/变更
  - 文件: core-server/utils/watch-story-specifiers.ts

监听层 4: GitDiffProvider — .git 目录监听
  - 用于: 检测 git 状态变更以更新 change detection 状态
  - 文件: core-server/change-detection/GitDiffProvider.ts

具体原因:

原因 1: chokidar 的 glob 模式与绝对路径不匹配
  Vite 的 server.watch.ignored 传入 chokidar 的 ignored 选项。
  chokidar 使用 anymatch 进行模式匹配, 事件中的路径是绝对路径
  (如 /app/storybook/tsconfig.json), 而 glob 模式 "**/tsconfig.json"
  在 anymatch 中对绝对路径的匹配行为取决于实现版本:
  - anymatch 3.x 中, glob 模式会对路径的每个部分进行匹配
  - 但在某些边界情况下(如路径包含特殊字符或深度嵌套), 匹配可能失败
  - 更可靠的做法是使用函数或正则表达式

原因 2: Watchpack 监听器绕过了 server.watch.ignored
  watchConfig.ts 和 watch-story-specifiers.ts 使用独立的 Watchpack 实例,
  各自只忽略 "**/.git" 和 "**/node_modules"。
  如果 tsconfig.json 位于 .storybook/ 目录内或 story 文件目录内,
  Watchpack 会检测到变更并触发完整重启, 完全绕过 Vite 的忽略配置。

原因 3: change detection adapter 无差别转发所有事件
  createViteChangeDetectionAdapter 订阅 server.watcher.on('all', ...)
  并将所有 add/change/unlink 事件转发给 StoryDependencyGraphService。
  即使 chokidar 的 ignored 过滤了某些文件, 如果过滤不完整,
  tsconfig.json 的变更仍会进入依赖图更新流程, 触发状态重新计算。

原因 4: Vite 内部 HMR 机制
  Vite 的模块图可能将 tsconfig.json 标记为 TypeScript 文件的隐式依赖。
  当 tsconfig.json 变更时, Vite 可能独立于 chokidar 的 ignored 配置
  触发受影响模块的 HMR 更新或完整重载。
`;

export const FIX_A_VITE_FINAL_WITH_FUNCTION = `
// ============================================================
// 方案 A: 修改 Vite server.watch.ignored — 使用函数代替 glob
// ============================================================
//
// 原理: anymatch 的函数模式对绝对路径匹配最可靠。
//       函数接收文件的绝对路径, 返回 true 表示忽略该文件。
//
// 在 .storybook/main.ts 中通过 viteFinal 配置:

import type { StorybookConfig } from '@storybook/react-vite';
import { basename, relative } from 'node:path';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',

  async viteFinal(config, { configType }) {
    const projectRoot = config.root ?? process.cwd();

    const isIgnored = (filePath: string) => {
      const rel = relative(projectRoot, filePath);

      // 忽略 .nx/cache 目录
      if (rel.includes('.nx/cache') || rel.includes('.nx\\\\cache')) return true;

      // 忽略所有 tsconfig.json 文件
      if (basename(filePath) === 'tsconfig.json') return true;

      // 忽略 tsconfig 的衍生文件 (如 tsconfig.app.json, tsconfig.node.json)
      if (/^tsconfig\\./.test(basename(filePath))) return true;

      return false;
    };

    // 合并而非替换: 保留 Vite 默认的忽略规则
    const existingIgnored = config.server?.watch?.ignored;
    const ignoredArray = Array.isArray(existingIgnored)
      ? existingIgnored
      : existingIgnored
        ? [existingIgnored]
        : [];

    config.server ??= {};
    config.server.watch ??= {};
    config.server.watch.ignored = [
      ...ignoredArray,
      isIgnored,
    ];

    return config;
  },
};

export default config;
`;

export const FIX_B_WATCHPACK_IGNORED_PATCH = `
// ============================================================
// 方案 B: 在 Storybook 源码中为 Watchpack 添加忽略规则
// ============================================================
//
// 原理: 修改 watchConfig.ts 和 watch-story-specifiers.ts 中的
//       Watchpack ignored 数组, 添加对 tsconfig.json 和 .nx/cache
//       的忽略。这确保即使文件在监听目录内, 也不会触发重启。

// 修改文件 1: code/core/src/core-server/utils/watchConfig.ts
// 修改前:
const wp = new Watchpack({
  followSymlinks: false,
  ignored: ['**/.git', '**/node_modules'],
});

// 修改后:
const wp = new Watchpack({
  followSymlinks: false,
  ignored: [
    '**/.git',
    '**/node_modules',
    '**/.nx/cache',
    '**/tsconfig.json',
    '**/tsconfig.*.json',
  ],
});

// 修改文件 2: code/core/src/core-server/utils/watch-story-specifiers.ts
// 修改前:
const wp = new Watchpack({
  followSymlinks: false,
  ignored: ['**/.git', '**/node_modules'],
});

// 修改后:
const wp = new Watchpack({
  followSymlinks: false,
  ignored: [
    '**/.git',
    '**/node_modules',
    '**/.nx/cache',
    '**/tsconfig.json',
    '**/tsconfig.*.json',
  ],
});
`;

export const FIX_C_CHANGE_DETECTION_FILTER_PATCH = `
// ============================================================
// 方案 C: 在 change detection adapter 中添加过滤逻辑
// ============================================================
//
// 原理: 在 createViteChangeDetectionAdapter 的 onFileChange 回调中
//       添加路径过滤, 跳过不需要参与依赖图计算的文件。
//       这不会阻止 Vite 的 HMR, 但会阻止 change detection 状态
//       的不必要重新计算。
//
// 修改文件: code/builders/builder-vite/src/change-detection-adapter/index.ts

import { basename } from 'pathe';

const IGNORED_PATTERNS = [
  /[/\\\\]\\.nx[/\\\\]cache[/\\\\]/,
  /[/\\\\]tsconfig\\.json$/,
  /[/\\\\]tsconfig\\.[\\w.]+\\.json$/,
];

function isIgnoredForChangeDetection(filePath: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(filePath));
}

// 然后在 onAll 回调中添加过滤:
const onAll = (eventName: string, path: string) => {
  if (!isForwardedEvent(eventName)) {
    return;
  }
  // 新增: 过滤不需要参与 change detection 的文件
  if (isIgnoredForChangeDetection(path)) {
    return;
  }
  handler({ kind: eventName, path: normalize(path) });
};
`;

export const FIX_D_VITE_SERVER_DEFAULT_IGNORED_PATCH = `
// ============================================================
// 方案 D: 在 vite-server.ts 中设置默认的 server.watch.ignored
// ============================================================
//
// 原理: 在 Storybook 创建 Vite server 时, 直接注入默认的忽略规则,
//       这样即使用户没有在 viteFinal 中配置, 也能避免常见的不必要重载。
//       用户仍可通过 viteFinal 覆盖或扩展这些规则。
//
// 修改文件: code/builders/builder-vite/src/vite-server.ts

import { basename, relative } from 'pathe';

export async function createViteServer(options: Options, devServer: Server) {
  const { presets } = options;

  const commonCfg = await commonConfig(options, 'development');

  const { allowedHosts } = await presets.apply('core', {});

  const projectRoot = commonCfg.root ?? process.cwd();

  const defaultWatchIgnored = [
    // 函数形式确保对绝对路径的可靠匹配
    (filePath: string) => {
      const rel = relative(projectRoot, filePath);
      if (rel.includes('.nx/cache') || rel.includes('.nx\\\\cache')) return true;
      if (/^tsconfig(\\.\\w+)?\\.json$/.test(basename(filePath))) return true;
      return false;
    },
  ];

  const config: InlineConfig & { server: ServerOptions } = {
    ...commonCfg,
    server: {
      allowedHosts,
      middlewareMode: true,
      hmr: {
        port: options.port,
        server: devServer,
      },
      fs: {
        strict: true,
      },
      watch: {
        ignored: defaultWatchIgnored,
      },
    },
  };

  // ... 其余代码不变
}
`;

export const FIX_E_RECOMMENDED_COMBINATION = `
// ============================================================
// 方案 E (推荐组合): 同时修复 Vite 层和 Watchpack 层
// ============================================================
//
// 最可靠的方案是同时修复两个层面:
// 1. 在 vite-server.ts 中设置默认的 server.watch.ignored (方案 D)
// 2. 在 watchConfig.ts 和 watch-story-specifiers.ts 中扩展忽略列表 (方案 B)
// 3. 在 change-detection-adapter 中添加过滤 (方案 C)
//
// 这三层防护确保:
// - Vite 的 chokidar 不会将 tsconfig.json 变更传播到 HMR
// - Watchpack 不会因 tsconfig.json 变更触发完整重启
// - change detection 不会因 tsconfig.json 变更重新计算状态
`;

export const VERIFICATION_GUIDE = `
// ============================================================
// 验证方法
// ============================================================
//
// 步骤 1: 启动 Storybook 开发服务器
//   cd code && yarn storybook:ui
//
// 步骤 2: 打开浏览器开发者工具的 Network 面板, 筛选 WS (WebSocket) 连接,
//         观察 HMR 事件。
//
// 步骤 3: 修改项目根目录的 tsconfig.json (例如添加一个空行或注释)
//   echo "// test comment" >> tsconfig.json
//
// 步骤 4: 观察浏览器行为
//   - 修复前: 页面会完整重新加载 (full reload)
//   - 修复后: 页面不应有任何变化
//
// 步骤 5: 检查终端日志
//   - 修复前: 可能看到 "change detection" 相关的扫描日志
//   - 修复后: 不应出现与 tsconfig.json 相关的变更检测日志
//
// 步骤 6: 使用 DEBUG 环境变量进行详细验证
//   DEBUG=storybook:change-detection yarn storybook
//   修改 tsconfig.json 后, 确认日志中没有与该文件相关的事件
//
// 步骤 7: 验证 .nx/cache 忽略
//   touch .nx/cache/test-file
//   确认不会触发任何重载
//
// 步骤 8: 验证正常 HMR 仍然工作
//   修改一个 .stories.tsx 文件
//   确认 HMR 正常触发 (不应被过度忽略)
//
// 步骤 9: 自动化验证脚本 (见 verify-watch-ignored.mjs)
`;

export const COMPARISON_TABLE = `
// ============================================================
// 方案对比与推荐
// ============================================================
//
// | 方案 | 修改范围           | 可靠性           | 副作用风险 | 推荐度   |
// |------|-------------------|-----------------|-----------|---------|
// | A    | 用户配置           | 高(仅Vite层)     | 低        | ★★★★   |
// | B    | Storybook 源码     | 高(覆盖Watchpack)| 低       | ★★★★   |
// | C    | Storybook 源码     | 中(仅限CD层)     | 低        | ★★★    |
// | D    | Storybook 源码     | 高(Vite层默认)   | 中        | ★★★    |
// | E    | 多处              | 最高(全层覆盖)    | 中        | ★★★★★  |
//
// 推荐策略:
// - 如果是用户级修复(不改 Storybook 源码): 使用方案 A
// - 如果是 Storybook 源码级修复: 使用方案 E (B + C + D 组合)
// - 方案 B 和 D 是最关键的, 因为它们覆盖了两个独立的监听系统
// - 方案 C 是额外的安全网, 防止 change detection 的不必要计算
`;
