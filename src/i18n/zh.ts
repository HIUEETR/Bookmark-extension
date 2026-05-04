import type { Translations } from "./en";

const zh: Translations = {
  app: {
    title: "我的书签",
    loading: "正在加载书签...",
  },
  header: {
    addColumn: "添加列",
    clearEmpty: "清理空文件夹",
    deleteSelected: "删除 ({{count}})",
    import: "导入",
    export: "导出",
    undo: "撤销 ({{count}})",
  },
  selection: {
    count: "已选择 {{count}} 项",
    dropHint: "拖放到列中以移动",
  },
  column: {
    newFolder: "新建文件夹",
    renameFolder: "重命名文件夹",
    deleteFolder: "删除文件夹",
    removeColumn: "移除列",
  },
  tree: {
    rename: "重命名",
    root: "(根目录)",
  },
  modal: {
    emptyFolders: {
      title: "空文件夹",
      subtitle: "选择要保留的文件夹（未勾选的将被删除）：",
      noFolders: "没有找到空文件夹",
      cancel: "取消",
      delete: "删除 ({{count}})",
    },
    prompt: {
      newFolder: "新建文件夹",
      rename: "重命名",
      cancel: "取消",
      ok: "确定",
    },
  },
  toast: {
    folderCreated: "文件夹已创建",
    folderRenamed: "文件夹已重命名",
    bookmarkRenamed: "书签已重命名",
    folderDeleted: "文件夹已删除",
    bookmarkMoved: "书签已移动",
    bookmarksMoved: "书签已批量移动",
    deletedEmpty: "已删除 {{count}} 个空文件夹",
    deletedItems: "已删除 {{count}} 个项目",
    exported: "书签已导出",
    imported: "书签已导入",
    undoSuccessful: "撤销成功",
    deleteFailed: "删除文件夹失败",
    importFailed: "导入书签失败",
    deleteItemsFailed: "删除项目失败",
  },
  confirm: {
    deleteFolder: '确定删除文件夹"{{name}}"吗？',
    deleteFolderWithContents:
      '确定删除"{{name}}"吗？\n\n所有内容将被删除。\n\n点击确定继续。',
    deleteFolderWarning:
      "该文件夹包含书签。确定要删除吗？\n\n点击确定删除。",
    deleteFolderFinal:
      '最后警告："{{name}}"将被永久删除！\n\n点击确定继续。',
    deleteSelected: "确定删除选中的 {{count}} 个项目吗？",
  },
} as const;

export default zh;
