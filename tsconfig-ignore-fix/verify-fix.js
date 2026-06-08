#!/usr/bin/env node
/**
 * 验证 Storybook tsconfig ignore 修复是否生效的脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证 Storybook tsconfig.json 忽略修复...\n');

// 检查 main.ts 配置
const mainTsPath = path.join(process.cwd(), '.storybook', 'main.ts');
const mainJsPath = path.join(process.cwd(), '.storybook', 'main.js');

const mainConfigPath = fs.existsSync(mainTsPath) ? mainTsPath : 
                      fs.existsSync(mainJsPath) ? mainJsPath : null;

if (mainConfigPath) {
  console.log(`✅ 找到配置文件: ${mainConfigPath}`);
  
  try {
    const content = fs.readFileSync(mainConfigPath, 'utf-8');
    
    // 检查是否有 viteFinal 钩子
    if (content.includes('viteFinal')) {
      console.log('✅ 配置中包含 viteFinal 钩子');
    } else {
      console.log('⚠️  警告: 配置中缺少 viteFinal 钩子');
    }
    
    // 检查是否包含 tsconfig 相关的忽略规则
    if (content.includes('tsconfig') && content.includes('ignored')) {
      console.log('✅ 配置中包含 tsconfig 忽略规则');
    } else {
      console.log('⚠️  警告: 配置中可能缺少 tsconfig 忽略规则');
    }
    
  } catch (err) {
    console.error('❌ 读取配置文件时出错:', err);
  }
} else {
  console.log('⚠️  警告: 未找到 .storybook/main.ts 或 main.js');
}

// 检查 vite.config
const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
const viteConfigJsPath = path.join(process.cwd(), 'vite.config.js');

const viteConfigPathFinal = fs.existsSync(viteConfigPath) ? viteConfigPath : 
                           fs.existsSync(viteConfigJsPath) ? viteConfigJsPath : null;

if (viteConfigPathFinal) {
  console.log(`\n✅ 找到 Vite 配置文件: ${viteConfigPathFinal}`);
  try {
    const content = fs.readFileSync(viteConfigPathFinal, 'utf-8');
    if (content.includes('server.watch') || content.includes('watch.ignored')) {
      console.log('✅ Vite 配置中包含 watch 配置');
    }
  } catch (err) {
    console.error('❌ 读取 Vite 配置文件时出错:', err);
  }
}

console.log('\n📋 验证步骤:');
console.log('  1. 启动 Storybook: yarn storybook');
console.log('  2. 在另一个终端中，对 tsconfig.json 做一个小修改');
console.log('  3. 观察浏览器是否发生完整重新加载');
console.log('  4. 如果没有完整重新加载，则修复生效！\n');
