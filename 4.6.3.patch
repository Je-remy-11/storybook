import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs';

/**
 * 在 Storybook 的 main.ts 中安全地插入一个新的 addon
 * @param mainTsPath main.ts 的绝对或相对路径
 * @param addonName 需要添加的 addon 名称
 */
export function insertAddon(mainTsPath: string, addonName: string) {
  if (!fs.existsSync(mainTsPath)) {
    console.error(`❌ 错误: 找不到文件 ${mainTsPath}`);
    process.exit(1);
  }

  // 初始化 ts-morph Project
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(mainTsPath);

  // 深度查找名为 'addons' 的属性赋值节点
  const addonsProperty = sourceFile
    .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
    .find((prop) => prop.getName() === 'addons');

  if (!addonsProperty) {
    console.error('❌ 错误: 未能在目标文件中找到 "addons" 配置项。');
    process.exit(1);
  }

  // 确保 addons 的值是一个数组表达式
  const initializer = addonsProperty.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
  if (!initializer) {
    console.error('❌ 错误: "addons" 属性的值不是一个数组。');
    process.exit(1);
  }

  // 获取当前所有的数组元素
  const elements = initializer.getElements();
  
  // 提取现有 addon 的纯文本名称（利用正则去掉包裹的单/双引号）
  const existingAddons = elements.map((el) => el.getText().replace(/['"`]/g, ''));

  // 1. 检查 addon 是否已经存在，避免重复添加
  if (existingAddons.includes(addonName)) {
    console.log(`✅ Addon "${addonName}" 已经存在，跳过添加。`);
    return;
  }

  // 2. 查找 './services-preset.ts' 的索引位置
  const servicesPresetIndex = existingAddons.indexOf('./services-preset.ts');

  // 3. 确定插入位置：
  // 如果存在 './services-preset.ts'，则插入在它之前；否则直接插入到数组末尾
  const insertIndex = servicesPresetIndex !== -1 ? servicesPresetIndex : elements.length;

  // 4. 插入新的 addon（包裹单引号）
  initializer.insertElement(insertIndex, `'${addonName}'`);

  // 5. 保存修改到文件，ts-morph 能够完美保留原有的代码格式、缩进和注释
  sourceFile.saveSync();
  console.log(`🎉 成功将 "${addonName}" 添加到 addons 列表中！`);
}

// --- 命令行 CLI 执行逻辑 ---
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('💡 使用方式: ts-node add-addon.ts <main.ts路径> <addon名称>');
    console.log('📌 例如: ts-node add-addon.ts .storybook/main.ts @storybook/addon-interactions');
    process.exit(1);
  }

  const targetPath = path.resolve(process.cwd(), args[0]);
  const targetAddon = args[1];

  insertAddon(targetPath, targetAddon);
}
