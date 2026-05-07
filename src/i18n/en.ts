const en = {
  common: {
    close: "Close",
    delete: "Delete",
    deleteSelected: "Delete selected",
    working: "Working...",
  },
  app: {
    title: "My Bookmark",
    loading: "Loading bookmarks...",
  },
  header: {
    addColumn: "Add Column",
    clearEmpty: "Clear Empty",
    deleteSelected: "Delete ({{count}})",
    moveTo: "Move to...",
    import: "Import",
    exportJson: "Export JSON",
    exportHtml: "Export HTML",
    undo: "Undo ({{count}})",
    duplicates: "Duplicates",
    broken: "Check Links",
    layouts: "Layouts",
    trash: "Trash",
    systemLocale: "Auto",
    toggleTheme: "Toggle theme",
  },
  selection: {
    count: "{{count}} selected",
    dropHint: "Drop on a column or choose Move to...",
  },
  column: {
    newFolder: "New folder",
    renameFolder: "Rename folder",
    deleteFolder: "Delete folder",
    removeColumn: "Remove column",
    goBack: "Go back",
  },
  tree: {
    rename: "Rename",
    root: "(root)",
  },
  search: {
    placeholder: "Search title, URL, or path...",
    noResults: "No results",
  },
  stats: {
    bookmarks: "Bookmarks",
    folders: "Folders",
    emptyFolders: "Empty",
    duplicates: "Duplicates",
  },
  details: {
    title: "Bookmark details",
    name: "Name",
    url: "URL",
    path: "Path",
    dateAdded: "Added",
    edit: "Edit",
    copyUrl: "Copy URL",
  },
  modal: {
    emptyFolders: {
      title: "Empty Folders",
      subtitle: "Select folders to delete. Nothing is selected by default.",
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
    confirm: {
      typeToConfirm: 'Type "{{value}}" to confirm',
    },
    bookmarkEdit: {
      title: "Edit bookmark",
      name: "Title",
      url: "URL",
      invalidUrl: "Enter a valid URL",
    },
    folderPicker: {
      title: "Choose destination folder",
      search: "Search folders...",
    },
  },
  duplicates: {
    title: "Duplicate bookmarks",
    subtitle: "The first item in each group is kept by default. Select duplicates to delete.",
    none: "No duplicate bookmarks found",
  },
  broken: {
    title: "Link checker",
    subtitle: "Checks selected bookmarks, or up to 50 bookmarks from the library. Some sites hide status, so unknown does not always mean broken.",
    check: "Run check",
    empty: "Run a check to see results",
    ok: "OK",
    broken: "Broken",
    unknown: "Unknown",
  },
  layouts: {
    title: "Layout presets",
    namePlaceholder: "Preset name",
    save: "Save layout",
    empty: "No saved layouts",
    saved: "Layout saved",
  },
  trash: {
    title: "Trash",
    empty: "No recent deletes",
    restore: "Restore",
    restored: "Item restored",
  },
  toast: {
    folderCreated: "Folder created",
    folderRenamed: "Folder renamed",
    bookmarkRenamed: "Bookmark updated",
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
    moveFailed: "Failed to move bookmarks",
    undoFailed: "Failed to undo",
    operationFailed: "Operation failed",
  },
  undo: {
    batch: "{{count}} bookmarks",
  },
  confirm: {
    deleteFolderTitle: "Delete folder",
    deleteSelectedTitle: "Delete selected items",
    deleteFolder: 'Delete folder "{{name}}"?',
    deleteFolderWithContents: 'Delete "{{name}}" and all of its contents? This cannot be undone from the browser, but a restore copy will be saved in Trash.',
    deleteSelected: "Delete {{count}} selected item(s)? A restore copy will be saved in Trash.",
    deleteSelectedFolders: "Delete {{count}} selected empty folder(s)?",
  },
};

export default en;

type DeepStringify<T> = T extends string
  ? string
  : T extends object
    ? { [K in keyof T]: DeepStringify<T[K]> }
    : T;

export type Translations = DeepStringify<typeof en>;
