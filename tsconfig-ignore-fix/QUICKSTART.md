# 快速开始

按照以下步骤快速应用修复：

## 最简单的方案（推荐）

### 1. 复制配置示例

```bash
# 如果您使用 TypeScript
cp tsconfig-ignore-fix/main.ts.example .storybook/main.ts

# 或者如果您使用 JavaScript
# cp tsconfig-ignore-fix/main.ts.example .storybook/main.js
```

### 2. 根据您的项目修改配置

编辑 `.storybook/main.ts`，确保：
- stories 路径正确
- addons 列表符合您的项目
- framework 设置正确

### 3. 重启 Storybook

```bash
# 停止当前的 Storybook (Ctrl+C)，然后重新启动
yarn storybook
```

### 4. 验证修复

运行验证脚本：
```bash
node tsconfig-ignore-fix/verify-fix.js
```

然后手动测试：
1. 打开 Storybook
2. 对 tsconfig.json 做一个小修改（比如添加/删除一个空行）
3. 观察浏览器是否发生完整重新加载
4. 如果没有，说明修复成功！

## 高级选项

如果简单方案不够，您可以：

1. **同时修改 vite.config.ts** - 参考 [vite.config.ts.example](./vite.config.ts.example)

2. **应用源代码补丁** - 如果您想修改 Storybook 源代码来永久修复：
   ```bash
   cd /path/to/storybook
   git apply 4.1.5.patch
   ```

## 需要帮助？

查看 [README.md](./README.md) 获取更多详细信息。
