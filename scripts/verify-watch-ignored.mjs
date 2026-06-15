#!/usr/bin/env node

/**
 * 验证脚本: 确认 tsconfig.json 和 .nx/cache 的修改不会触发 Storybook 页面重新加载
 *
 * 使用方法:
 *   1. 启动 Storybook 开发服务器: cd code && yarn storybook:ui
 *   2. 在另一个终端运行此脚本: node scripts/verify-watch-ignored.mjs
 *
 * 预期结果:
 *   - 修改 tsconfig.json 后, 浏览器不应重新加载
 *   - 创建 .nx/cache 文件后, 浏览器不应重新加载
 *   - 修改 .stories.tsx 文件后, HMR 应正常工作
 */

import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const TEST_FILES = [
  { path: join(rootDir, 'tsconfig.json'), name: 'tsconfig.json' },
  { path: join(rootDir, 'tsconfig.app.json'), name: 'tsconfig.app.json' },
  { path: join(rootDir, '.nx/cache/test-marker'), name: '.nx/cache/test-marker' },
];

function backupFile(filePath) {
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf-8');
  }
  return null;
}

function restoreFile(filePath, content) {
  if (content !== null) {
    writeFileSync(filePath, content, 'utf-8');
  } else {
    rmSync(filePath, { force: true });
  }
}

function touchFile(filePath, marker) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const original = backupFile(filePath);

  if (original !== null) {
    writeFileSync(filePath, original + `\n// verify-watch-ignored: ${marker}\n`, 'utf-8');
  } else {
    writeFileSync(filePath, `// verify-watch-ignored: ${marker}\n`, 'utf-8');
  }

  return original;
}

async function runVerification() {
  console.log('='.repeat(60));
  console.log('Storybook watch.ignored 验证脚本');
  console.log('='.repeat(60));
  console.log();
  console.log('请确保 Storybook 开发服务器正在运行 (cd code && yarn storybook:ui)');
  console.log('打开浏览器开发者工具的 Network 面板, 筛选 WS (WebSocket) 连接');
  console.log();

  const backups = new Map();

  for (const { path, name } of TEST_FILES) {
    console.log(`测试: 修改 ${name}...`);
    const original = touchFile(path, Date.now().toString());
    backups.set(path, original);

    console.log(`  已修改 ${name}, 请观察浏览器是否重新加载`);
    console.log('  预期: 页面不应有任何变化');
    console.log();

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('恢复所有文件...');
  for (const [path, content] of backups) {
    restoreFile(path, content);
  }

  console.log();
  console.log('验证完成!');
  console.log('如果浏览器在以上测试中均未重新加载, 说明修复已生效');
  console.log('如果浏览器重新加载了, 请检查:');
  console.log('  1. vite-server.ts 中的 defaultWatchIgnored 是否正确注入');
  console.log('  2. watchConfig.ts 中的 Watchpack ignored 是否已更新');
  console.log('  3. watch-story-specifiers.ts 中的 Watchpack ignored 是否已更新');
  console.log('  4. change-detection-adapter/index.ts 中的过滤逻辑是否生效');
}

runVerification().catch(console.error);
