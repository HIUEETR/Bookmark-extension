import { useState, useEffect, useRef } from "react";
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

interface ToastProps {
  message: string;
  onClose: () => void;
}

function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={toastStyles.container}>
      <span>{message}</span>
      <button onClick={onClose} style={toastStyles.closeBtn}>×</button>
    </div>
  );
}

interface PromptModalProps {
  title: string;
  defaultValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

function PromptModal({ title, defaultValue, onSubmit, onCancel }: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div style={modalStyles.overlay} onClick={onCancel}>
      <div style={promptModalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={promptModalStyles.title}>{title}</h3>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={promptModalStyles.input}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit(value);
            if (e.key === "Escape") onCancel();
          }}
        />
        <div style={promptModalStyles.actions}>
          <button onClick={onCancel} style={promptModalStyles.cancelBtn}>Cancel</button>
          <button onClick={() => onSubmit(value)} style={promptModalStyles.submitBtn}>OK</button>
        </div>
      </div>
    </div>
  );
}

interface EmptyFolderModalProps {
  emptyFolders: { id: string; title: string; path: string }[];
  onDelete: (ids: string[]) => void;
  onClose: () => void;
}

function EmptyFolderModal({ emptyFolders, onDelete, onClose }: EmptyFolderModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
          {emptyFolders.length === 0 ? (
            <div style={modalStyles.empty}>No empty folders found</div>
          ) : (
            emptyFolders.map((folder) => (
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
            ))
          )}
        </div>
        <div style={modalStyles.actions}>
          <button onClick={onClose} style={modalStyles.cancelBtn}>Cancel</button>
          <button
            onClick={handleDelete}
            disabled={emptyFolders.length === 0}
            style={{
              ...modalStyles.deleteBtn,
              ...(emptyFolders.length === 0 ? modalStyles.deleteBtnDisabled : {}),
            }}
          >
            Delete ({emptyFolders.length - selected.size})
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
  const [toast, setToast] = useState<string | null>(null);
  const [promptModal, setPromptModal] = useState<{ type: string; data?: any } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const showToast = (message: string) => {
    setToast(message);
  };

  async function loadBookmarks() {
    const tree = await getTree();
    const folders = extractAllFolders(tree);
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
      const roots = getRootFolders(tree);
      columnData = roots.slice(0, 2).map((f, i) => ({
        id: `col-${Date.now()}-${i}`,
        folderId: f.id,
        folderTitle: f.title || "Bookmark Bar",
        tree: f.children || [],
        expandedFolders: new Set<string>(),
        parentChain: [{ id: f.id, title: f.title || "Bookmark Bar" }],
      }));
    }

    setAllFolders(folders);
    setColumns(columnData);
  }

  function getRootFolders(nodes: BookmarkNode[]): BookmarkNode[] {
    for (const node of nodes) {
      if (node.id === "0" && node.children) {
        return node.children.filter((n) => !n.url);
      }
    }
    return [];
  }

  function extractAllFolders(nodes: BookmarkNode[], pathPrefix = ""): { id: string; title: string; path: string }[] {
    const result: { id: string; title: string; path: string }[] = [];
    for (const node of nodes) {
      if (node.id === "0" && node.children) {
        result.push(...extractAllFolders(node.children, ""));
      } else if (!node.url && node.id !== "0") {
        const path = pathPrefix ? `${pathPrefix} / ${node.title}` : node.title;
        result.push({ id: node.id, title: node.title || "(root)", path });
        if (node.children) {
          result.push(...extractAllFolders(node.children, path));
        }
      }
    }
    return result;
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

  function isFolderEmpty(node: BookmarkNode): boolean {
    if (node.url) return false;
    if (!node.children || node.children.length === 0) return true;
    const hasDirectBookmarks = node.children.some((child) => child.url);
    if (hasDirectBookmarks) return false;
    return node.children.every((child) => isFolderEmpty(child));
  }

  function findEmptyFoldersInTree(tree: BookmarkNode[]): { id: string; title: string; path: string }[] {
    const result: { id: string; title: string; path: string }[] = [];
    const traverse = (nodes: BookmarkNode[], path: string) => {
      for (const node of nodes) {
        if (node.id === "0") {
          if (node.children) traverse(node.children, path);
          continue;
        }
        if (!node.url) {
          const nodePath = path ? `${path} / ${node.title}` : node.title;
          if (isFolderEmpty(node)) {
            result.push({ id: node.id, title: node.title || "(root)", path: nodePath });
          }
          if (node.children) {
            traverse(node.children, nodePath);
          }
        }
      }
    };
    traverse(tree, "");
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
    const empty = findEmptyFoldersInTree(tree);
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
      showToast(`Deleted ${ids.length} empty folder(s)`);
    } catch (err) {
      console.error("Failed to delete folders:", err);
      showToast("Failed to delete folders");
    }
  };

  const addColumn = () => {
    const usedFolderIds = new Set(columns.map((c) => c.folderId));
    const available = allFolders.filter((f) => !usedFolderIds.has(f.id));
    if (available.length === 0) return;

    getTree().then((tree) => {
      const newFolderId = available[0].id;
      const newColumn: ColumnData = {
        id: `col-${Date.now()}`,
        folderId: newFolderId,
        folderTitle: available[0].title,
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
    setPromptModal({ type: "createFolder", data: { columnId } });
  };

  const handlePromptSubmit = (value: string) => {
    if (!promptModal) return;

    if (promptModal.type === "createFolder") {
      const { columnId } = promptModal.data;
      const column = columns.find((c) => c.id === columnId);
      if (!column || !value.trim()) {
        setPromptModal(null);
        return;
      }

      chrome.bookmarks.create(
        { parentId: column.folderId, title: value.trim() },
        () => {
          setPromptModal(null);
          getTree().then((tree) => {
            setColumns((prev) => {
              const newColumns = prev.map((col) => {
                if (col.id === columnId) {
                  return {
                    ...col,
                    tree: findFolderTree(tree, col.folderId) || [],
                  };
                }
                return col;
              });
              return newColumns;
            });
          });
          showToast("Folder created");
        }
      );
    } else if (promptModal.type === "renameFolder") {
      const { id } = promptModal.data;
      if (!value.trim()) {
        setPromptModal(null);
        setRenamingId(null);
        return;
      }

      chrome.bookmarks.update(id, { title: value.trim() }, () => {
        setPromptModal(null);
        setRenamingId(null);
        loadBookmarks();
        showToast("Folder renamed");
      });
    } else if (promptModal.type === "renameBookmark") {
      const { id } = promptModal.data;
      if (!value.trim()) {
        setPromptModal(null);
        setRenamingId(null);
        return;
      }

      chrome.bookmarks.update(id, { title: value.trim() }, () => {
        setPromptModal(null);
        setRenamingId(null);
        loadBookmarks();
        showToast("Bookmark renamed");
      });
    }
  };

  const deleteCurrentFolder = (columnId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const column = columns.find((c) => c.id === columnId);
    if (!column) return;

    // If bookmarks are selected, delete them instead
    if (selectedIds.size > 0) {
      handleDeleteSelected();
      return;
    }

    const currentTitle = column.parentChain.length > 0
      ? column.parentChain[column.parentChain.length - 1].title
      : column.folderTitle;

    const hasContent = column.tree.some((node) => node.url || (node.children && node.children.length > 0));

    if (hasContent) {
      const confirm1 = confirm(`Delete "${currentTitle}"?\n\nAll contents will be deleted.\n\nClick OK to continue.`);
      if (!confirm1) return;

      const confirm2 = confirm(`This folder contains bookmarks. Are you ABSOLUTELY sure?\n\nClick OK to delete.`);
      if (!confirm2) return;

      const confirm3 = confirm(`FINAL WARNING: "${currentTitle}" will be permanently deleted!\n\nClick OK to continue.`);
      if (!confirm3) return;
    } else {
      const confirmed = confirm(`Delete folder "${currentTitle}"?`);
      if (!confirmed) return;
    }

    chrome.bookmarks.removeTree(column.folderId, () => {
      if (column.parentChain.length > 1) {
        const newParentId = column.parentChain[column.parentChain.length - 2].id;
        changeColumnFolderDirect(columnId, newParentId);
      } else {
        getTree().then((tree) => {
          const allRoots = getRootFolders(tree);
          if (allRoots.length > 0) {
            changeColumnFolderDirect(columnId, allRoots[0].id);
          }
        });
      }
      showToast("Folder deleted");
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = confirm(`Delete ${selectedIds.size} selected item(s)?`);
    if (!confirmed) return;

    try {
      for (const id of selectedIds) {
        await chrome.bookmarks.remove(id);
      }
      setSelectedIds(new Set());
      loadBookmarks();
      showToast(`Deleted ${selectedIds.size} item(s)`);
    } catch (err) {
      console.error("Failed to delete:", err);
      showToast("Failed to delete items");
    }
  };

  const handleExport = () => {
    chrome.bookmarks.getTree((tree) => {
      const exportData = JSON.stringify(tree, null, 2);
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookmarks-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Bookmarks exported");
    });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        // Import using chrome.bookmarks.createTree or similar
        // Edge/Chrome don't have a direct import tree API, so we use bookmark bar
        const importTree = async (nodes: any[], parentId: string) => {
          for (const node of nodes) {
            if (node.url) {
              await chrome.bookmarks.create({ parentId, title: node.title, url: node.url });
            } else if (node.children) {
              const folder = await chrome.bookmarks.create({ parentId, title: node.title });
              await importTree(node.children, folder.id);
            }
          }
        };

        // Find bookmark bar (first root folder)
        const tree = await chrome.bookmarks.getTree();
        const bookmarkBar = tree.find(n => n.title === "" || n.id === "0");

        if (bookmarkBar && bookmarkBar.children) {
          await importTree(bookmarkBar.children, bookmarkBar.id);
        } else {
          await importTree(data, "1"); // Use first bookmark folder ID
        }

        loadBookmarks();
        showToast("Bookmarks imported");
      } catch (err) {
        console.error("Failed to import:", err);
        showToast("Failed to import bookmarks");
      }
    };
    input.click();
  };

  const changeColumnFolderDirect = (columnId: string, newFolderId: string) => {
    getTree().then((tree) => {
      const parentChain = buildParentChain(tree, newFolderId);
      const folder = allFolders.find((f) => f.id === newFolderId);
      const title = parentChain.length > 0 ? parentChain[parentChain.length - 1].title : (folder?.title || "Unknown");
      setColumns((prev) => {
        const newColumns = prev.map((col) => {
          if (col.id === columnId) {
            return {
              ...col,
              folderId: newFolderId,
              folderTitle: title,
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

  const changeColumnFolder = (columnId: string, newFolderId: string) => {
    changeColumnFolderDirect(columnId, newFolderId);
  };

  const goBack = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (!column || column.parentChain.length <= 1) return;

    const parentId = column.parentChain[column.parentChain.length - 2].id;
    changeColumnFolderDirect(columnId, parentId);
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

    for (const col of columns) {
      const found = findBookmarkInTree(col.tree, bookmarkId);
      if (found) {
        sourceParentId = col.folderId;
        break;
      }
    }

    if (!sourceParentId) return;

    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    try {
      await moveBookmark(bookmarkId, targetColumn.folderId, targetIndex);
      loadBookmarks();
      setSelectedIds(new Set());
      showToast("Bookmark moved");
    } catch (err) {
      console.error("Failed to move bookmark:", err);
    }
  };

  const findBookmarkInTree = (tree: BookmarkNode[], id: string): boolean => {
    for (const node of tree) {
      if (node.id === id) return true;
      if (node.children) {
        if (findBookmarkInTree(node.children, id)) return true;
      }
    }
    return false;
  };

  const moveSelectedBookmarks = async (targetColumnId: string) => {
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    const targetIndex = targetColumn.tree.length;

    for (const id of selectedIds) {
      try {
        await moveBookmark(id, targetColumn.folderId, targetIndex);
      } catch (err) {
        console.error("Failed to move bookmark:", err);
      }
    }

    loadBookmarks();
    setSelectedIds(new Set());
    showToast("Bookmarks moved");
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    const lastRecord = undoStack[undoStack.length - 1];
    try {
      await moveBookmark(lastRecord.bookmarkId, lastRecord.fromParentId, lastRecord.fromIndex);
      setUndoStack((prev) => prev.slice(0, -1));
      loadBookmarks();
      showToast("Undo successful");
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
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} style={styles.deleteButton}>
              Delete ({selectedIds.size})
            </button>
          )}
          <button onClick={handleImport} style={styles.importButton}>📥 Import</button>
          <button onClick={handleExport} style={styles.exportButton}>📤 Export</button>
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
                <span style={styles.folderPath}>
                  {column.parentChain.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && <span style={styles.pathSeparator}> / </span>}
                      <span
                        style={i === column.parentChain.length - 1 ? styles.currentFolder : styles.parentFolder}
                        onClick={() => {
                          if (i < column.parentChain.length - 1) {
                            changeColumnFolder(column.id, p.id);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (i < column.parentChain.length - 1) {
                            (e.target as HTMLSpanElement).style.textDecoration = "underline";
                            (e.target as HTMLSpanElement).style.cursor = "pointer";
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLSpanElement).style.textDecoration = "";
                        }}
                      >
                        {p.title}
                      </span>
                    </span>
                  ))}
                </span>
              </div>
              <div style={styles.columnActions}>
                <button
                  onClick={() => createNewFolder(column.id)}
                  style={styles.newFolderButton}
                  title="New folder"
                >
                  +📁
                </button>
                <button
                  onClick={(e) => {
                    const currentTitle = column.parentChain.length > 0
                      ? column.parentChain[column.parentChain.length - 1].title
                      : column.folderTitle;
                    setPromptModal({ type: "renameFolder", data: { id: column.folderId, title: currentTitle } });
                    setRenamingId(column.folderId);
                  }}
                  style={styles.renameButton}
                  title="Rename folder"
                >
                  📝
                </button>
                <button
                  onClick={(e) => deleteCurrentFolder(column.id, e)}
                  style={styles.deleteFolderButton}
                  title="Delete folder"
                >
                  🗑
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
                getFaviconUrl={getFaviconUrl}
                onNavigate={(folderId) => changeColumnFolder(column.id, folderId)}
                onRename={(id, title, url) => {
                  setPromptModal({ type: "renameBookmark", data: { id, title, url } });
                  setRenamingId(id);
                }}
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

      {promptModal && (
        <PromptModal
          title={promptModal.type === "createFolder" ? "New Folder" : "Rename"}
          defaultValue={
            promptModal.type === "renameFolder" ? (promptModal.data.title || "") :
            promptModal.type === "renameBookmark" ? (promptModal.data.title || "") : ""
          }
          onSubmit={handlePromptSubmit}
          onCancel={() => {
            setPromptModal(null);
            setRenamingId(null);
          }}
        />
      )}

      {toast && (
        <Toast message={toast} onClose={() => setToast(null)} />
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
  getFaviconUrl: (url: string) => string;
  onNavigate?: (folderId: string) => void;
  onRename?: (id: string, title: string, url?: string) => void;
  depth?: number;
}

function TreeView({
  nodes,
  expandedFolders,
  selectedIds,
  onToggle,
  onSelect,
  getFaviconUrl,
  onNavigate,
  onRename,
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
                onClick={(e) => {
                  e.stopPropagation();
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
                  getFaviconUrl={getFaviconUrl}
                  onNavigate={onNavigate}
                  onRename={onRename}
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename?.(node.id, node.title || "", node.url || "");
              }}
              style={styles.itemRenameBtn}
              title="Rename"
            >
              📝
            </button>
          </div>
        );
      })}
    </div>
  );
}

const toastStyles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#374151",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    zIndex: 2000,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: "16px",
    padding: "0 4px",
  },
};

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
  empty: {
    padding: "20px",
    textAlign: "center",
    color: "#6b7280",
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

const promptModalStyles: Record<string, React.CSSProperties> = {
  modal: {
    backgroundColor: "#16213e",
    borderRadius: "8px",
    padding: "20px",
    minWidth: "300px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "12px",
    color: "#eee",
  },
  input: {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #0f3460",
    backgroundColor: "#1a1a2e",
    color: "#eee",
    marginBottom: "12px",
    boxSizing: "border-box",
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
  submitBtn: {
    padding: "8px 16px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#4f46e5",
    color: "#fff",
    cursor: "pointer",
  },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100vw",
    height: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#eee",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "16px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    padding: "0 4px",
    flexShrink: 0,
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
  deleteButton: {
    padding: "6px 12px",
    fontSize: "13px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#ef4444",
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
  importButton: {
    padding: "6px 12px",
    fontSize: "13px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#6366f1",
    color: "#fff",
    cursor: "pointer",
  },
  exportButton: {
    padding: "6px 12px",
    fontSize: "13px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#6366f1",
    color: "#fff",
    cursor: "pointer",
  },
  selectionBar: {
    padding: "12px",
    marginBottom: "12px",
    backgroundColor: "#4f46e5",
    borderRadius: "6px",
    fontSize: "14px",
    textAlign: "center",
    flexShrink: 0,
  },
  columnsContainer: {
    display: "flex",
    gap: "16px",
    flex: 1,
    overflow: "hidden",
    minHeight: 0,
  },
  column: {
    minWidth: "280px",
    maxWidth: "350px",
    flex: 1,
    backgroundColor: "#16213e",
    borderRadius: "8px",
    border: "2px solid transparent",
    transition: "border-color 0.2s",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
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
    flexShrink: 0,
  },
  columnNav: {
    display: "flex",
    flex: 1,
    alignItems: "center",
    gap: "4px",
    overflow: "hidden",
  },
  folderPath: {
    fontSize: "13px",
    color: "#93c5fd",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  pathSeparator: {
    color: "#6b7280",
  },
  parentFolder: {
    color: "#9ca3af",
  },
  currentFolder: {
    color: "#93c5fd",
    fontWeight: 500,
  },
  columnActions: {
    display: "flex",
    gap: "4px",
    flexShrink: 0,
  },
  backButton: {
    padding: "8px 12px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#374151",
    color: "#fff",
    cursor: "pointer",
    flexShrink: 0,
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
  renameButton: {
    padding: "6px 8px",
    fontSize: "12px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#6366f1",
    color: "#fff",
    cursor: "pointer",
  },
  deleteFolderButton: {
    padding: "6px 8px",
    fontSize: "12px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#6b7280",
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
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
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
  itemRenameBtn: {
    padding: "4px 6px",
    fontSize: "11px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#374151",
    color: "#9ca3af",
    cursor: "pointer",
    opacity: 0.7,
  },
};