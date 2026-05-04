import { useState, useEffect } from "react";
import type { BookmarkNode, MoveRecord } from "./types";
import { getTree, moveBookmark } from "./lib/bookmarks";

interface ColumnData {
  id: string;
  folderId: string;
  folderTitle: string;
  tree: BookmarkNode[];
  expandedFolders: Set<string>;
  parentChain: { id: string; title: string }[];
}

const STORAGE_KEY = "my-bookmark-state";

interface SavedState {
  columns: { id: string; folderId: string; folderTitle: string; expandedFolders: string[]; parentChain: { id: string; title: string }[] }[];
}

interface EmptyFolderModalProps {
  emptyFolders: { id: string; title: string; path: string }[];
  onDelete: (ids: string[]) => void;
  onClose: () => void;
}

function EmptyFolderModal({ emptyFolders, onDelete, onClose }: EmptyFolderModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(emptyFolders.map((f) => f.id)));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleDelete = () => {
    const toDelete = emptyFolders.filter((f) => !selected.has(f.id)).map((f) => f.id);
    onDelete(toDelete);
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={modalStyles.title}>Empty Folders</h2>
        <p style={modalStyles.subtitle}>Select folders to KEEP (unchecked will be deleted):</p>
        <div style={modalStyles.list}>
          {emptyFolders.map((folder) => (
            <div
              key={folder.id}
              style={{
                ...modalStyles.item,
                ...(selected.has(folder.id) ? {} : modalStyles.itemExcluded),
              }}
              onClick={() => toggleSelect(folder.id)}
            >
              <input
                type="checkbox"
                checked={selected.has(folder.id)}
                onChange={() => toggleSelect(folder.id)}
                style={{ marginRight: "8px" }}
              />
              <span>{folder.title}</span>
              <span style={modalStyles.path}>{folder.path}</span>
            </div>
          ))}
        </div>
        <div style={modalStyles.actions}>
          <button onClick={onClose} style={modalStyles.cancelBtn}>Cancel</button>
          <button
            onClick={handleDelete}
            style={modalStyles.deleteBtn}
          >
            Delete Others ({emptyFolders.length - selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [allFolders, setAllFolders] = useState<{ id: string; title: string; path: string }[]>([]);
  const [undoStack, setUndoStack] = useState<MoveRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragTargetColumn, setDragTargetColumn] = useState<string | null>(null);
  const [emptyFolders, setEmptyFolders] = useState<{ id: string; title: string; path: string }[]>([]);
  const [showEmptyModal, setShowEmptyModal] = useState(false);

  useEffect(() => {
    loadBookmarks();
  }, []);

  async function loadBookmarks() {
    const tree = await getTree();
    const folders = extractFolders(tree);
    const savedState = loadSavedState();

    let columnData: ColumnData[];
    if (savedState && savedState.columns.length >= 2) {
      columnData = savedState.columns.map((col) => {
        const folder = folders.find((f) => f.id === col.folderId);
        return {
          id: col.id,
          folderId: col.folderId,
          folderTitle: folder?.title || col.folderTitle,
          tree: findFolderTree(tree, col.folderId) || [],
          expandedFolders: new Set(col.expandedFolders),
          parentChain: col.parentChain || [],
        };
      });
    } else {
      columnData = folders.slice(0, 2).map((f, i) => ({
        id: `col-${Date.now()}-${i}`,
        folderId: f.id,
        folderTitle: f.title,
        tree: findFolderTree(tree, f.id) || [],
        expandedFolders: new Set<string>(),
        parentChain: buildParentChain(tree, f.id),
      }));
    }

    setAllFolders(folders);
    setColumns(columnData);
  }

  function extractFolders(nodes: BookmarkNode[], pathPrefix = ""): { id: string; title: string; path: string }[] {
    const result: { id: string; title: string; path: string }[] = [];
    for (const node of nodes) {
      if (node.id === "0" && node.children) {
        result.push(...extractFolders(node.children, ""));
      } else if (!node.url && node.id !== "0") {
        const path = pathPrefix ? `${pathPrefix} / ${node.title}` : node.title;
        result.push({ id: node.id, title: node.title || "(root)", path });
      }
    }
    return result;
  }

  function buildParentChain(tree: BookmarkNode[], folderId: string): { id: string; title: string }[] {
    const chain: { id: string; title: string }[] = [];
    const find = (nodes: BookmarkNode[], target: string, path: { id: string; title: string }[]): boolean => {
      for (const node of nodes) {
        const currentPath = [...path, { id: node.id, title: node.title || "(root)" }];
        if (node.id === target) {
          chain.push(...currentPath);
          return true;
        }
        if (node.children) {
          if (find(node.children, target, currentPath)) return true;
        }
      }
      return false;
    };
    find(tree, folderId, []);
    return chain;
  }

  function getRootFolders(nodes: BookmarkNode[]): BookmarkNode[] {
    for (const node of nodes) {
      if (node.id === "0" && node.children) {
        return node.children.filter((n) => !n.url);
      }
    }
    return [];
  }

  function findFolderTree(tree: BookmarkNode[], folderId: string): BookmarkNode[] | null {
    for (const node of tree) {
      if (node.id === folderId) return node.children || [];
      if (node.children) {
        const found = findFolderTree(node.children, folderId);
        if (found) return found;
      }
    }
    return null;
  }

  function isEmptyFolder(node: BookmarkNode): boolean {
    if (node.url) return false;
    if (!node.children || node.children.length === 0) return true;
    // A folder is empty only if all its children are empty folders (no bookmarks directly in it)
    const hasDirectBookmarks = node.children.some((child) => child.url);
    if (hasDirectBookmarks) return false;
    // Check if all children are empty subfolders
    return node.children.every((child) => isEmptyFolder(child));
  }

  function findEmptyFolders(nodes: BookmarkNode[], path = ""): { id: string; title: string; path: string }[] {
    const result: { id: string; title: string; path: string }[] = [];
    for (const node of nodes) {
      if (!node.url && node.id !== "0") {
        const nodePath = path ? `${path} / ${node.title}` : node.title;
        if (isEmptyFolder(node)) {
          result.push({ id: node.id, title: node.title || "(root)", path: nodePath });
        }
        if (node.children) {
          result.push(...findEmptyFolders(node.children, nodePath));
        }
      }
    }
    return result;
  }

  function loadSavedState(): SavedState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  function saveState(columns: ColumnData[]) {
    const state: SavedState = {
      columns: columns.map((col) => ({
        id: col.id,
        folderId: col.folderId,
        folderTitle: col.folderTitle,
        expandedFolders: Array.from(col.expandedFolders),
        parentChain: col.parentChain,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const showClearEmptyModal = async () => {
    const tree = await getTree();
    const empty = findEmptyFolders(tree);
    setEmptyFolders(empty);
    setShowEmptyModal(true);
  };

  const handleDeleteEmptyFolders = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await chrome.bookmarks.removeTree(id);
      }
      setShowEmptyModal(false);
      loadBookmarks();
    } catch (err) {
      console.error("Failed to delete folders:", err);
    }
  };

  const addColumn = () => {
    const usedFolderIds = new Set(columns.map((c) => c.folderId));
    const availableRoots = getRootFolders(columns[0]?.tree || []);
    const availableFolders = allFolders.filter(
      (f) => !usedFolderIds.has(f.id)
    );
    if (availableFolders.length === 0 && availableRoots.length === 0) return;

    getTree().then((tree) => {
      const newFolderId = availableFolders[0]?.id || availableRoots[0]?.id || "";
      const newColumn: ColumnData = {
        id: `col-${Date.now()}`,
        folderId: newFolderId,
        folderTitle: availableFolders[0]?.title || availableRoots[0]?.title || "Folder",
        tree: findFolderTree(tree, newFolderId) || [],
        expandedFolders: new Set(),
        parentChain: buildParentChain(tree, newFolderId),
      };

      const newColumns = [...columns, newColumn];
      setColumns(newColumns);
      saveState(newColumns);
    });
  };

  const removeColumn = (columnId: string) => {
    if (columns.length <= 2) return;
    const newColumns = columns.filter((c) => c.id !== columnId);
    setColumns(newColumns);
    saveState(newColumns);
  };

  const createNewFolder = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (!column) return;

    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    chrome.bookmarks.create(
      { parentId: column.folderId, title: folderName },
      () => {
        loadBookmarks();
      }
    );
  };

  const changeColumnFolder = (columnId: string, newFolderId: string) => {
    getTree().then((tree) => {
      const parentChain = buildParentChain(tree, newFolderId);
      const folder = allFolders.find((f) => f.id === newFolderId);
      setColumns((prev) => {
        const newColumns = prev.map((col) => {
          if (col.id === columnId) {
            return {
              ...col,
              folderId: newFolderId,
              folderTitle: folder?.title || "Unknown",
              tree: findFolderTree(tree, newFolderId) || [],
              expandedFolders: new Set<string>(),
              parentChain,
            };
          }
          return col;
        });
        saveState(newColumns);
        return newColumns;
      });
    });
  };

  const goBack = (columnId: string) => {
    setColumns((prev) => {
      const newColumns = prev.map((col) => {
        if (col.id === columnId && col.parentChain.length > 1) {
          const newChain = col.parentChain.slice(0, -1);
          const parentId = newChain[newChain.length - 1].id;
          const parent = newChain[newChain.length - 1];
          getTree().then((tree) => {
            setColumns((prev2) => {
              return prev2.map((c) => {
                if (c.id === columnId) {
                  return {
                    ...c,
                    folderId: parentId,
                    folderTitle: parent.title,
                    tree: findFolderTree(tree, parentId) || [],
                    parentChain: newChain,
                  };
                }
                return c;
              });
            });
          });
          return col;
        }
        return col;
      });
      return newColumns;
    });
  };

  const toggleFolder = (columnId: string, folderId: string) => {
    setColumns((prev) => {
      const newColumns = prev.map((col) => {
        if (col.id === columnId) {
          const expanded = new Set(col.expandedFolders);
          if (expanded.has(folderId)) {
            expanded.delete(folderId);
          } else {
            expanded.add(folderId);
          }
          return { ...col, expandedFolders: expanded };
        }
        return col;
      });
      saveState(newColumns);
      return newColumns;
    });
  };

  const toggleSelect = (bookmarkId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookmarkId)) {
        newSet.delete(bookmarkId);
      } else {
        newSet.add(bookmarkId);
      }
      return newSet;
    });
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragTargetColumn(columnId);
  };

  const handleColumnDragLeave = () => {
    setDragTargetColumn(null);
  };

  const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragTargetColumn(null);

    if (selectedIds.size === 0) {
      const bookmarkId = e.dataTransfer.getData("text/plain");
      if (!bookmarkId) return;
      await moveSingleBookmark(bookmarkId, targetColumnId, 0);
    } else {
      await moveSelectedBookmarks(targetColumnId);
    }
  };

  const moveSingleBookmark = async (bookmarkId: string, targetColumnId: string, targetIndex: number) => {
    let sourceParentId = "";
    let sourceIndex = -1;

    for (const col of columns) {
      const idx = findBookmarkIndex(col.tree, bookmarkId);
      if (idx !== -1) {
        sourceParentId = col.folderId;
        sourceIndex = idx;
        break;
      }
    }

    if (sourceParentId === "") return;

    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    const record: MoveRecord = {
      bookmarkId,
      fromParentId: sourceParentId,
      fromIndex: sourceIndex,
      toParentId: targetColumn.folderId,
      toIndex: targetIndex,
    };

    try {
      await moveBookmark(bookmarkId, targetColumn.folderId, targetIndex);
      setUndoStack((prev) => [...prev, record]);
      loadBookmarks();
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to move bookmark:", err);
    }
  };

  const moveSelectedBookmarks = async (targetColumnId: string) => {
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    const bookmarks = flattenTree(targetColumn.tree);
    const targetIndex = bookmarks.length;

    for (const id of selectedIds) {
      let sourceParentId = "";
      for (const col of columns) {
        if (findBookmarkIndex(col.tree, id) !== -1) {
          sourceParentId = col.folderId;
          break;
        }
      }
      if (sourceParentId) {
        try {
          await moveBookmark(id, targetColumn.folderId, targetIndex);
        } catch (err) {
          console.error("Failed to move bookmark:", err);
        }
      }
    }

    loadBookmarks();
    setSelectedIds(new Set());
  };

  const findBookmarkIndex = (tree: BookmarkNode[], id: string): number => {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].id === id) return i;
      if (tree[i].children && tree[i].children.length > 0) {
        const idx = findBookmarkIndex(tree[i].children, id);
        if (idx !== -1) return idx;
      }
    }
    return -1;
  };

  const flattenTree = (nodes: BookmarkNode[]): BookmarkNode[] => {
    const result: BookmarkNode[] = [];
    for (const node of nodes) {
      if (node.url) {
        result.push(node);
      }
    }
    return result;
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    const lastRecord = undoStack[undoStack.length - 1];
    try {
      await moveBookmark(lastRecord.bookmarkId, lastRecord.fromParentId, lastRecord.fromIndex);
      setUndoStack((prev) => prev.slice(0, -1));
      loadBookmarks();
    } catch (err) {
      console.error("Failed to undo:", err);
    }
  };

  const getFaviconUrl = (url: string): string => {
    try {
      const domain = new URL(url).origin;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return "";
    }
  };

  if (columns.length === 0) {
    return (
      <div style={styles.container}>
        <p>Loading bookmarks...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={styles.title}>My Bookmark</h1>
          <button onClick={addColumn} style={styles.addButton}>+ Add Column</button>
          <button onClick={showClearEmptyModal} style={styles.clearEmptyButton}>
            Clear Empty
          </button>
        </div>
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          style={{
            ...styles.undoButton,
            ...(undoStack.length === 0 ? styles.undoButtonDisabled : {}),
          }}
        >
          Undo ({undoStack.length})
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div style={styles.selectionBar}>
          {selectedIds.size} selected - Drop on a column to move
        </div>
      )}

      <div style={styles.columnsContainer}>
        {columns.map((column) => (
          <div
            key={column.id}
            style={{
              ...styles.column,
              ...(dragTargetColumn === column.id ? styles.columnDragOver : {}),
            }}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleColumnDrop(e, column.id)}
          >
            <div style={styles.columnHeader}>
              <div style={styles.columnNav}>
                {column.parentChain.length > 1 && (
                  <button
                    onClick={() => goBack(column.id)}
                    style={styles.backButton}
                    title="Go back"
                  >
                    ←
                  </button>
                )}
                <select
                  value={column.folderId}
                  onChange={(e) => changeColumnFolder(column.id, e.target.value)}
                  style={styles.folderSelect}
                >
                  {allFolders
                    .filter((f) => !f.path.includes("/"))
                    .map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.title}
                      </option>
                    ))}
                </select>
              </div>
              <div style={styles.columnActions}>
                <button
                  onClick={() => createNewFolder(column.id)}
                  style={styles.newFolderButton}
                  title="New folder"
                >
                  +📁
                </button>
                {columns.length > 2 && (
                  <button
                    onClick={() => removeColumn(column.id)}
                    style={styles.removeButton}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div style={styles.bookmarkTree}>
              <TreeView
                nodes={column.tree}
                expandedFolders={column.expandedFolders}
                selectedIds={selectedIds}
                onToggle={(id) => toggleFolder(column.id, id)}
                onSelect={toggleSelect}
                onDrop={moveSingleBookmark}
                getFaviconUrl={getFaviconUrl}
                onNavigate={(folderId) => changeColumnFolder(column.id, folderId)}
              />
            </div>
          </div>
        ))}
      </div>

      {showEmptyModal && (
        <EmptyFolderModal
          emptyFolders={emptyFolders}
          onDelete={handleDeleteEmptyFolders}
          onClose={() => setShowEmptyModal(false)}
        />
      )}
    </div>
  );
}

interface TreeViewProps {
  nodes: BookmarkNode[];
  expandedFolders: Set<string>;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDrop: (bookmarkId: string, columnId: string, index: number) => void;
  getFaviconUrl: (url: string) => string;
  onNavigate?: (folderId: string) => void;
  depth?: number;
}

function TreeView({
  nodes,
  expandedFolders,
  selectedIds,
  onToggle,
  onSelect,
  onDrop,
  getFaviconUrl,
  onNavigate,
  depth = 0,
}: TreeViewProps) {
  return (
    <div style={{ paddingLeft: depth * 16 + "px" }}>
      {nodes.map((node) => {
        const isFolder = !node.url;
        const isExpanded = expandedFolders.has(node.id);

        if (isFolder) {
          const hasChildren = node.children && node.children.length > 0;
          return (
            <div key={node.id}>
              <div
                style={styles.folderItem}
                onClick={() => {
                  if (hasChildren) {
                    onToggle(node.id);
                  }
                  onNavigate?.(node.id);
                }}
              >
                <span style={styles.expandIcon}>
                  {hasChildren ? (isExpanded ? "▼" : "▶") : ""}
                </span>
                <span style={styles.folderIcon}>📁</span>
                <span style={styles.folderName}>{node.title || "(root)"}</span>
              </div>
              {isExpanded && node.children && (
                <TreeView
                  nodes={node.children}
                  expandedFolders={expandedFolders}
                  selectedIds={selectedIds}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onDrop={onDrop}
                  getFaviconUrl={getFaviconUrl}
                  onNavigate={onNavigate}
                  depth={depth + 1}
                />
              )}
            </div>
          );
        }

        return (
          <div
            key={node.id}
            style={{
              ...styles.bookmarkItem,
              ...(selectedIds.has(node.id) ? styles.bookmarkItemSelected : {}),
            }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", node.id);
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(node.id)}
              onChange={() => onSelect(node.id)}
              style={styles.checkbox}
            />
            <img
              src={getFaviconUrl(node.url!)}
              alt=""
              style={styles.favicon}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.bookmarkLink}
              onClick={(e) => e.stopPropagation()}
            >
              {node.title || node.url}
            </a>
          </div>
        );
      })}
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#16213e",
    borderRadius: "8px",
    padding: "20px",
    minWidth: "400px",
    maxWidth: "600px",
    maxHeight: "80vh",
    overflow: "auto",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#eee",
  },
  subtitle: {
    fontSize: "14px",
    color: "#9ca3af",
    marginBottom: "16px",
  },
  list: {
    maxHeight: "400px",
    overflowY: "auto",
    marginBottom: "16px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: "10px",
    marginBottom: "4px",
    backgroundColor: "#1a1a2e",
    borderRadius: "4px",
    cursor: "pointer",
  },
  itemExcluded: {
    backgroundColor: "#450a0a",
    textDecoration: "line-through",
    opacity: 0.7,
  },
  itemSelected: {
    backgroundColor: "#374151",
  },
  path: {
    marginLeft: "8px",
    fontSize: "12px",
    color: "#6b7280",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },
  cancelBtn: {
    padding: "8px 16px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#374151",
    color: "#fff",
    cursor: "pointer",
  },
  deleteBtn: {
    padding: "8px 16px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#ef4444",
    color: "#fff",
    cursor: "pointer",
  },
  deleteBtnDisabled: {
    backgroundColor: "#374151",
    cursor: "not-allowed",
    opacity: 0.6,
  },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    minHeight: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#eee",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "16px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    padding: "0 4px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    margin: 0,
  },
  addButton: {
    padding: "6px 12px",
    fontSize: "13px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#10b981",
    color: "#fff",
    cursor: "pointer",
  },
  clearEmptyButton: {
    padding: "6px 12px",
    fontSize: "13px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#f59e0b",
    color: "#fff",
    cursor: "pointer",
  },
  undoButton: {
    padding: "6px 12px",
    fontSize: "13px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#4f46e5",
    color: "#fff",
    cursor: "pointer",
  },
  undoButtonDisabled: {
    backgroundColor: "#374151",
    cursor: "not-allowed",
    opacity: 0.6,
  },
  selectionBar: {
    padding: "12px",
    marginBottom: "12px",
    backgroundColor: "#4f46e5",
    borderRadius: "6px",
    fontSize: "14px",
    textAlign: "center",
  },
  columnsContainer: {
    display: "flex",
    gap: "16px",
    overflowX: "auto",
  },
  column: {
    minWidth: "280px",
    maxWidth: "350px",
    flex: 1,
    backgroundColor: "#16213e",
    borderRadius: "8px",
    border: "2px solid transparent",
    transition: "border-color 0.2s",
  },
  columnDragOver: {
    borderColor: "#4f46e5",
  },
  columnHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    borderBottom: "1px solid #0f3460",
  },
  folderSelect: {
    flex: 1,
    padding: "8px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #0f3460",
    backgroundColor: "#1a1a2e",
    color: "#eee",
    cursor: "pointer",
  },
  columnNav: {
    display: "flex",
    flex: 1,
    gap: "4px",
  },
  columnActions: {
    display: "flex",
    gap: "4px",
  },
  backButton: {
    padding: "8px 12px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#374151",
    color: "#fff",
    cursor: "pointer",
  },
  newFolderButton: {
    padding: "6px 8px",
    fontSize: "12px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#10b981",
    color: "#fff",
    cursor: "pointer",
  },
  removeButton: {
    width: "28px",
    height: "28px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    lineHeight: 1,
  },
  bookmarkTree: {
    padding: "8px",
    minHeight: "300px",
    maxHeight: "calc(100vh - 200px)",
    overflowY: "auto",
  },
  folderItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 8px",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "background-color 0.15s",
  },
  expandIcon: {
    fontSize: "10px",
    color: "#6b7280",
    width: "14px",
  },
  folderIcon: {
    fontSize: "14px",
  },
  folderName: {
    fontSize: "13px",
    color: "#93c5fd",
  },
  bookmarkItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 8px",
    marginBottom: "2px",
    backgroundColor: "#1a1a2e",
    borderRadius: "4px",
    border: "1px solid transparent",
    transition: "all 0.15s",
  },
  bookmarkItemSelected: {
    backgroundColor: "#1f2937",
    borderColor: "#4f46e5",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  favicon: {
    width: "16px",
    height: "16px",
    borderRadius: "2px",
  },
  bookmarkLink: {
    flex: 1,
    color: "#93c5fd",
    textDecoration: "none",
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};