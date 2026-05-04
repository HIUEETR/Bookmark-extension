export interface BookmarkNode {
  id: string;
  parentId?: string;
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

export interface ColumnFolder {
  id: string;
  title: string;
  expanded: Set<string>;
}