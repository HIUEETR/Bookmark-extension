export interface BookmarkNode {
  id: string;
  parentId?: string;
  index?: number;
  title: string;
  url?: string;
  dateAdded?: number;
  children?: BookmarkNode[];
}

export interface MoveRecord {
  bookmarkId: string;
  fromParentId: string;
  fromIndex: number;
  toParentId: string;
  toIndex: number;
}

export interface BatchMoveRecord {
  id: string;
  label: string;
  records: MoveRecord[];
}

export interface FolderOption {
  id: string;
  title: string;
  path: string;
}

export interface ColumnData {
  id: string;
  folderId: string;
  folderTitle: string;
  tree: BookmarkNode[];
  expandedFolders: Set<string>;
  parentChain: { id: string; title: string }[];
}

export interface SavedColumn {
  id: string;
  folderId: string;
  folderTitle: string;
  expandedFolders: string[];
  parentChain: { id: string; title: string }[];
}

export interface SavedState {
  columns: SavedColumn[];
}

export type PromptState =
  | { type: "createFolder"; columnId: string }
  | { type: "renameFolder"; id: string; title: string };

export type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  requireText?: string;
  onConfirm: () => Promise<void> | void;
};

export interface ImportedBookmarkNode {
  title: string;
  url?: string;
  children?: ImportedBookmarkNode[];
}

export interface BookmarkDetail {
  node: BookmarkNode;
  path: string;
}

export interface LayoutPreset {
  id: string;
  name: string;
  columns: SavedColumn[];
  createdAt: number;
}

export interface TrashEntry {
  id: string;
  deletedAt: number;
  title: string;
  parentId?: string;
  node: BookmarkNode;
}

export interface DuplicateGroup {
  url: string;
  items: BookmarkDetail[];
}

export interface BookmarkStats {
  bookmarks: number;
  folders: number;
  emptyFolders: number;
  duplicateUrls: number;
  topDomains: { domain: string; count: number }[];
}

export interface BrokenBookmarkResult {
  id: string;
  title: string;
  url: string;
  path: string;
  status: "ok" | "broken" | "unknown";
  reason: string;
}

export type Locale = "en" | "zh";
export type LocaleSetting = Locale | "system";

export interface ColumnFolder {
  id: string;
  title: string;
  expanded: Set<string>;
}
