# My Bookmark

My Bookmark 是一个 Chrome/Edge Manifest V3 书签管理扩展，提供多列文件夹视图、拖拽整理、搜索、导入导出、重复项检查、链接检查、布局预设和回收站备份。

## 功能

- 多列浏览书签文件夹，支持新增/移除列。
- 全局搜索标题、URL 和路径，并可定位到所在文件夹。
- 拖拽移动书签，支持拖到具体位置排序。
- 批量选择、批量移动和批量删除。
- 移动撤销栈，支持撤销单个或批量移动。
- 编辑书签标题和 URL，重命名文件夹。
- 清理空文件夹，采用“勾选即删除”的安全语义。
- 重复书签扫描，按标准化 URL 分组。
- 手动链接检查，最多检查 50 个目标并区分正常、失效和未知。
- 书签详情侧栏，显示路径、URL、添加时间并支持复制 URL。
- JSON 与 Netscape HTML 书签导入/导出。
- 回收站备份，删除前保存可恢复副本。
- 主题和语言设置使用 `chrome.storage.local`，本地开发回退到 `localStorage`。

## 开发

```powershell
npm install
npm run dev
```

本地 Vite 开发环境没有浏览器扩展 API 时，会使用 mock 书签树和本地存储 fallback。

## 构建扩展

```powershell
npm run build
```

构建结果位于 `dist/`。脚本会复制 `src/background.js`，生成 `sidepanel.html`，并把根目录 `manifest.json` 复制到 `dist/manifest.json`。

## 加载到浏览器

1. 运行 `npm run build`。
2. 打开 Chrome/Edge 扩展管理页。
3. 启用开发者模式。
4. 选择“加载已解压的扩展”。
5. 选择项目的 `dist/` 目录。

## 验证命令

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## 权限说明

- `bookmarks`：读取、创建、移动、更新和删除书签。
- `storage`：保存主题、语言、列布局、布局预设和回收站元数据。

链接检查目前手动触发，并尽量保守处理跨域限制。由于未申请所有站点 host 权限，部分链接可能显示为“未知”，这不一定代表链接失效。

## 导入导出格式

- JSON：适合本扩展备份和恢复。
- HTML：兼容浏览器常用 Netscape Bookmark File 格式。

导入时会把内容导入当前第一列所在文件夹，避免错误地复制当前浏览器现有书签树。

## 已知限制

- 失效链接检查受 CORS、站点策略和网络环境影响，未知状态需要人工确认。
- 回收站恢复会尽量恢复到原父文件夹；如果原父文件夹不存在，恢复可能失败。
- 大书签库优化以过滤、派生数据 memo、限制搜索结果和减少全量刷新为主，尚未引入第三方虚拟滚动库。
