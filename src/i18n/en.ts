const en = {
  app: {
    title: "My Bookmark",
    loading: "Loading bookmarks...",
  },
  header: {
    addColumn: "Add Column",
    clearEmpty: "Clear Empty",
    deleteSelected: "Delete ({{count}})",
    import: "Import",
    export: "Export",
    undo: "Undo ({{count}})",
  },
  selection: {
    count: "{{count}} selected",
    dropHint: "Drop on a column to move",
  },
  column: {
    newFolder: "New folder",
    renameFolder: "Rename folder",
    deleteFolder: "Delete folder",
    removeColumn: "Remove column",
  },
  tree: {
    rename: "Rename",
    root: "(root)",
  },
  modal: {
    emptyFolders: {
      title: "Empty Folders",
      subtitle: "Select folders to KEEP (unchecked will be deleted):",
      noFolders: "No empty folders found",
      cancel: "Cancel",
      delete: "Delete ({{count}})",
    },
    prompt: {
      newFolder: "New Folder",
      rename: "Rename",
      cancel: "Cancel",
      ok: "OK",
    },
  },
  toast: {
    folderCreated: "Folder created",
    folderRenamed: "Folder renamed",
    bookmarkRenamed: "Bookmark renamed",
    folderDeleted: "Folder deleted",
    bookmarkMoved: "Bookmark moved",
    bookmarksMoved: "Bookmarks moved",
    deletedEmpty: "Deleted {{count}} empty folder(s)",
    deletedItems: "Deleted {{count}} item(s)",
    exported: "Bookmarks exported",
    imported: "Bookmarks imported",
    undoSuccessful: "Undo successful",
    deleteFailed: "Failed to delete folders",
    importFailed: "Failed to import bookmarks",
    deleteItemsFailed: "Failed to delete items",
  },
  confirm: {
    deleteFolder: 'Delete folder "{{name}}"?',
    deleteFolderWithContents: 'Delete "{{name}}"?\n\nAll contents will be deleted.\n\nClick OK to continue.',
    deleteFolderWarning: "This folder contains bookmarks. Are you ABSOLUTELY sure?\n\nClick OK to delete.",
    deleteFolderFinal: 'FINAL WARNING: "{{name}}" will be permanently deleted!\n\nClick OK to continue.',
    deleteSelected: "Delete {{count}} selected item(s)?",
  },
};

export default en;

type DeepStringify<T> = T extends string
  ? string
  : T extends object
    ? { [K in keyof T]: DeepStringify<T[K]> }
    : T;

export type Translations = DeepStringify<typeof en>;
