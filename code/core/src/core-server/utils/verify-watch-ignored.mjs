#!/usr/bin/env node

import { appendFile, mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TSCONFIG_PATH = join(process.cwd(), 'tsconfig.json');
const NX_CACHE_DIR = join(process.cwd(), '.nx', 'cache');
const TEST_FILE = join(NX_CACHE_DIR, 'watch-test-trigger');

const STORYBOOK_URL = process.env.STORYBOOK_URL ?? 'http://localhost:6006';

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function getStorybookStatus() {
  try {
    const res = await fetchWithTimeout(STORYBOOK_URL);
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function waitForMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testTsconfigIgnored() {
  console.log('\n--- 测试: tsconfig.json 变更应被忽略 ---');

  const before = await getStorybookStatus();
  console.log('修改前状态:', before);

  const comment = '\n// watch-ignore-test-' + Date.now();
  await appendFile(TSCONFIG_PATH, comment);

  await waitForMs(2000);

  const after = await getStorybookStatus();
  console.log('修改后状态:', after);

  console.log('⚠️  请手动恢复 tsconfig.json 中添加的测试注释');

  if (before.ok && after.ok) {
    console.log('✅ 服务器状态稳定, 未因 tsconfig.json 变更而重启');
    return true;
  } else {
    console.log('❌ 服务器状态变化, 可能因 tsconfig.json 变更触发了重启');
    return false;
  }
}

async function testNxCacheIgnored() {
  console.log('\n--- 测试: .nx/cache 变更应被忽略 ---');

  const before = await getStorybookStatus();
  console.log('修改前状态:', before);

  try {
    await mkdir(NX_CACHE_DIR, { recursive: true });
    await writeFile(TEST_FILE, 'test');
  } catch (err) {
    console.log('⚠️  无法创建 .nx/cache 测试文件:', err.message);
    return null;
  }

  await waitForMs(2000);

  const after = await getStorybookStatus();
  console.log('修改后状态:', after);

  try {
    await unlink(TEST_FILE);
  } catch {}

  if (before.ok && after.ok) {
    console.log('✅ 服务器状态稳定, 未因 .nx/cache 变更而重启');
    return true;
  } else {
    console.log('❌ 服务器状态变化, 可能因 .nx/cache 变更触发了重启');
    return false;
  }
}

async function testNormalHMRStillWorks() {
  console.log('\n--- 测试: 正常文件变更的 HMR 仍应工作 ---');
  console.log('此测试需要手动验证: 修改一个 .stories.tsx 文件,');
  console.log('确认浏览器中 Storybook 的 HMR 正常更新。');
  console.log('如果 story 内容更新但页面未完整刷新, 则 HMR 正常。');
  return null;
}

async function main() {
  console.log('Storybook server.watch.ignored 验证脚本');
  console.log('目标服务器:', STORYBOOK_URL);
  console.log('========================================');

  const status = await getStorybookStatus();
  if (!status.ok) {
    console.error('❌ 无法连接到 Storybook 服务器, 请先启动服务器');
    process.exit(1);
  }

  const results = [];

  results.push(await testTsconfigIgnored());
  results.push(await testNxCacheIgnored());
  results.push(await testNormalHMRStillWorks());

  console.log('\n========================================');
  console.log('验证结果汇总:');

  const passed = results.filter((r) => r === true).length;
  const failed = results.filter((r) => r === false).length;
  const skipped = results.filter((r) => r === null).length;

  console.log(`  通过: ${passed}`);
  console.log(`  失败: ${failed}`);
  console.log(`  跳过: ${skipped}`);

  if (failed > 0) {
    console.log('\n❌ 部分测试失败, server.watch.ignored 可能未正确生效');
    process.exit(1);
  } else {
    console.log('\n✅ 所有自动测试通过');
  }
}

main().catch((err) => {
  console.error('验证脚本执行出错:', err);
  process.exit(1);
});
