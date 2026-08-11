<p align="center">
  <img src="image/README/banner.svg" alt="Bookmark-Extension" width="100%" />
</p>

<div align="center">

[简体中文](README.md) · [English](README.en.md)

</div>

# Bookmark-Extension

> Chrome / Edge 浏览器书签管理扩展 —— 多列浏览、拖拽整理、搜索、导入导出、回收站备份。

基于 Manifest V3，直接读写浏览器原生书签树，提供比浏览器自带书签管理器更强大的整理能力

## 功能

### 浏览与导航

- 多列浏览书签文件夹，支持新增 / 移除列
- 列宽可调整，列顺序可拖拽
- 书签详情侧栏，显示路径、URL、添加时间并支持复制 URL

![1786467309382](image/README/1786467309382.png)

### 整理

![1786465825011](image/README/1786465825011.gif)

- 拖拽移动书签，支持拖到具体位置排序
- 批量选择、批量移动和批量删除
- 移动撤销栈，支持撤销单个或批量移动
- 编辑书签标题和 URL，重命名文件夹
- 清理空文件夹，采用"勾选即删除"的安全语义
- 根文件夹保护（书签栏 / 其他书签不可删除）

### 搜索

- 全局搜索标题、URL 和路径，并可定位到所在文件夹

### 检查

- 重复书签扫描，按标准化 URL 分组
- 手动链接检查，最多检查 50 个目标并区分正常、失效和未知

### 数据

- JSON 与 Netscape HTML 书签导入 / 导出
- 回收站备份，删除前保存可恢复副本
- 首次使用引导界面（书签为空时显示，支持导入文件或加载示例数据）

### 个性化

- 主题切换（亮色 / 暗色）
- 中英双语界面

## 技术栈

| 类别     | 技术                         |
| -------- | ---------------------------- |
| 框架     | React 18 + TypeScript 5      |
| 构建     | Vite 5                       |
| 扩展     | Chrome Extension Manifest V3 |
| 测试     | Vitest 4                     |
| 代码规范 | ESLint 10                    |

## 开发

```powershell
npm install
npm run dev
```

## 构建扩展

```powershell
npm run build
```

## 验证命令

```powershell
npm run typecheck   # 类型检查
npm run lint         # 代码规范检查
npm test             # 运行单元测试
npm run build        # 完整构建（含 postbuild）
```

## 项目结构

```
Bookmark/
├── src/
│   ├── components/         # React 组件（TreeView、各种 Modal、WelcomeScreen 等）
│   ├── context/            # I18n 与主题 Context
│   ├── i18n/               # 中英文翻译
│   ├── lib/                # 书签、存储、导入导出、清理等核心逻辑
│   ├── styles/             # CSS 样式（app.css、themes.css）
│   ├── types/              # TypeScript 类型定义
│   ├── App.tsx             # 主应用
│   ├── main.tsx            # 入口
│   ├── styles.css          # 全局样式
│   └── background.js       # 扩展 service worker
├── public/icons/           # 扩展图标（16 / 32 / 48 / 128）
├── scripts/copy-assets.cjs # 构建后处理脚本
├── manifest.json           # MV3 清单
├── vite.config.ts
└── tsconfig.json
```

## 权限说明

| 权限          | 用途                                 |
| ------------- | ------------------------------------ |
| `bookmarks` | 读取、创建、移动、更新和删除书签     |
| `storage`   | 保存主题、语言、列布局、回收站元数据 |

链接检查目前手动触发，并尽量保守处理跨域限制。由于未申请所有站点 host 权限，部分链接可能显示为"未知"，这不一定代表链接失效

## 导入导出格式

| 格式 | 说明                                       |
| ---- | ------------------------------------------ |
| JSON | 适合本扩展备份和恢复                       |
| HTML | 兼容浏览器常用 Netscape Bookmark File 格式 |

导入时会把内容放入"Imported Bookmarks"文件夹，避免错误地复制当前浏览器现有书签树

## 已知限制

- 失效链接检查受 CORS、站点策略和网络环境影响，未知状态需要人工确认
- 回收站恢复会尽量恢复到原父文件夹；如果原父文件夹不存在，恢复可能失败
- 大书签库优化以过滤、派生数据 memo、限制搜索结果和减少全量刷新为主，尚未引入第三方虚拟滚动库

## 相关项目

- [Bookmark-Web](https://github.com/HIUEETR/Bookmark-Web)：本扩展的纯网页版本，部署到 GitHub Pages，使用 localStorage 存储书签数据，无需安装扩展即可使用

## license

Apache-2.0 license
