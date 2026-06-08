#!/usr/bin/env node

import { readConfig, writeConfig } from '../code/core/src/csf-tools/ConfigFile.ts';
import { logger } from 'storybook/internal/node-logger';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { getInterpretedFile } from '../code/core/src/common/utils/interpret-files.ts';

/**
 * 在 main.ts 的 addons 数组中安全添加 addon
 * @param mainConfigPath main.ts 配置文件路径
 * @param addonName 要添加的 addon 名称
 * @param beforeAddon 在指定 addon 之前插入，默认为 './services-preset.ts'
 */
export async function addAddon(
  mainConfigPath: string,
  addonName: string,
  beforeAddon: string = './services-preset.ts'
) {
  // 读取配置
  const config = await readConfig(mainConfigPath);
  
  // 获取 addons 数组
  const addons = config.getFieldValue(['addons']) as string[];
  
  if (!Array.isArray(addons)) {
    logger.error('addons 不是数组');
    return false;
  }
  
  // 检查 addon 是否已经存在
  const addonExists = addons.some((addon) => {
    if (typeof addon === 'string') {
      return addon === addonName;
    }
    // 处理对象形式的 addon
    if (typeof addon === 'object' && addon !== null && 'name' in addon) {
      return (addon as any).name === addonName;
    }
    return false;
  });
  
  if (addonExists) {
    logger.info(`Addon "${addonName}" 已存在`);
    return false;
  }
  
  // 找到插入位置
  const addonsNode = config.getFieldNode(['addons']);
  
  if (!addonsNode || !('elements' in addonsNode)) {
    logger.error('无法找到 addons 数组');
    return false;
  }
  
  // 找到 beforeAddon 的位置
  const elements = addonsNode.elements as any[];
  let insertIndex = elements.length;
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element && 'type' in element) {
      if (element.type === 'StringLiteral' && element.value === beforeAddon) {
        insertIndex = i;
        break;
      }
    }
  }
  
  // 创建新的 addon 节点
  const addonNode = config.valueToNode(addonName);
  
  if (!addonNode) {
    logger.error('无法创建 addon 节点');
    return false;
  }
  
  // 插入 addon
  elements.splice(insertIndex, 0, addonNode);
  
  // 写入配置
  await writeConfig(config, mainConfigPath);
  
  logger.info(`成功添加 addon: ${addonName}`);
  return true;
}

/**
 * 找到 .storybook/main.ts 配置文件
 * @param cwd 当前工作目录
 */
function findMainConfig(cwd: string) {
  const storybookDir = join(cwd, '.storybook');
  if (!existsSync(storybookDir)) {
    logger.error(`无法找到 .storybook 目录: ${storybookDir}`);
    return undefined;
  }
  
  const mainPath = resolve(storybookDir, 'main.ts');
  const interpretedPath = getInterpretedFile(mainPath);
  
  if (!interpretedPath || !existsSync(interpretedPath)) {
    logger.error(`无法找到 main.ts 配置文件: ${mainPath}`);
    return undefined;
  }
  
  return interpretedPath;
}

// 命令行接口
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
Usage: add-addon <addon-name> [before-addon]
Example: add-addon @storybook/addon-interactions
`);
    process.exit(1);
  }
  
  const addonName = args[0];
  const beforeAddon = args[1] || './services-preset.ts';
  const cwd = process.cwd();
  
  const mainConfigPath = findMainConfig(cwd);
  
  if (!mainConfigPath) {
    process.exit(1);
  }
  
  addAddon(mainConfigPath, addonName, beforeAddon)
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      logger.error(err);
      process.exit(1);
    });
}
