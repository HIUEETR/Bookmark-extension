import { useState, useEffect } from "react";
import type { BookmarkNode, MoveRecord } from "./types";
import { getTree, moveBookmark } from "./lib/bookmarks";
import { useI18n } from "./context/I18nContext";
import { useTheme } from "./context/ThemeContext";
import { Toast } from "./components/Toast";
import { PromptModal } from "./components/PromptModal";
import { EmptyFolderModal } from "./components/EmptyFolderModal";
import { TreeView } from "./components/TreeView";
import {
  IconPlus,
  IconTrash,
  IconUndo,
  IconDownload,
  IconUpload,
  IconArrowLeft,
  IconFolderPlus,
  IconEdit,
  IconX,
  IconBroom,
  IconSun,
  IconMoon,
  IconLanguage,
  IconColumns,
} from "./components/Icons";
import "./styles/app.css";

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
  columns: {
    id: string;
    folderId: string;
    folderTitle: string;
    expandedFolders: string[];
    parentChain: { id: string; title: string }[];
  }[];
}

export default function App() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [allFolders, setAllFolders] = useState<{ id: string; title: string; path: string }[]>([]);
  const [undoStack, setUndoStack] = useState<MoveRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragTargetColumn, setDragTargetColumn] = useState<string | null>(null);
  const [emptyFolders, setEmptyFolders] = useState<{ id: string; title: string; path: string }[]>([]);
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [promptModal, setPromptModal] = useState<{ type: string; data?: any } | null>(null);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const showToast = (message: string) => setToast(message);

  // Helper to interpolate {{count}} etc.
  function tr(str: string, vars?: Record<string, string | number>): string {
    if (!vars) return str;
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
      str
    );
  }

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

  function extractAllFolders(
    nodes: BookmarkNode[],
    pathPrefix = ""
  ): { id: string; title: string; path: string }[] {
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

  function buildParentChain(
    tree: BookmarkNode[],
    folderId: string
  ): { id: string; title: string }[] {
    const chain: { id: string; title: string }[] = [];
    const find = (
      nodes: BookmarkNode[],
      target: string,
      path: { id: string; title: string }[]
    ): boolean => {
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

  function findEmptyFoldersInTree(
    tree: BookmarkNode[]
  ): { id: string; title: string; path: string }[] {
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

  function saveState(cols: ColumnData[]) {
    const state: SavedState = {
      columns: cols.map((col) => ({
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
      showToast(tr(t.toast.deletedEmpty, { count: ids.length }));
    } catch (err) {
      console.error("Failed to delete folders:", err);
      showToast(t.toast.deleteFailed);
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

      chrome.bookmarks.create({ parentId: column.folderId, title: value.trim() }, () => {
        setPromptModal(null);
        getTree().then((tree) => {
          setColumns((prev) =>
            prev.map((col) => {
              if (col.id === columnId) {
                return { ...col, tree: findFolderTree(tree, col.folderId) || [] };
              }
              return col;
            })
          );
        });
        showToast(t.toast.folderCreated);
      });
    } else if (promptModal.type === "renameFolder") {
      const { id } = promptModal.data;
      if (!value.trim()) {
        setPromptModal(null);
        return;
      }
      chrome.bookmarks.update(id, { title: value.trim() }, () => {
        setPromptModal(null);
        loadBookmarks();
        showToast(t.toast.folderRenamed);
      });
    } else if (promptModal.type === "renameBookmark") {
      const { id } = promptModal.data;
      if (!value.trim()) {
        setPromptModal(null);
        return;
      }
      chrome.bookmarks.update(id, { title: value.trim() }, () => {
        setPromptModal(null);
        loadBookmarks();
        showToast(t.toast.bookmarkRenamed);
      });
    }
  };

  const deleteCurrentFolder = (columnId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const column = columns.find((c) => c.id === columnId);
    if (!column) return;

    if (selectedIds.size > 0) {
      handleDeleteSelected();
      return;
    }

    const currentTitle =
      column.parentChain.length > 0
        ? column.parentChain[column.parentChain.length - 1].title
        : column.folderTitle;

    const hasContent = column.tree.some(
      (node) => node.url || (node.children && node.children.length > 0)
    );

    if (hasContent) {
      const confirm1 = confirm(tr(t.confirm.deleteFolderWithContents, { name: currentTitle }));
      if (!confirm1) return;
      const confirm2 = confirm(t.confirm.deleteFolderWarning);
      if (!confirm2) return;
      const confirm3 = confirm(tr(t.confirm.deleteFolderFinal, { name: currentTitle }));
      if (!confirm3) return;
    } else {
      const confirmed = confirm(tr(t.confirm.deleteFolder, { name: currentTitle }));
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
      showToast(t.toast.folderDeleted);
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = confirm(tr(t.confirm.deleteSelected, { count: selectedIds.size }));
    if (!confirmed) return;

    try {
      for (const id of selectedIds) {
        await chrome.bookmarks.remove(id);
      }
      setSelectedIds(new Set());
      loadBookmarks();
      showToast(tr(t.toast.deletedItems, { count: selectedIds.size }));
    } catch (err) {
      console.error("Failed to delete:", err);
      showToast(t.toast.deleteItemsFailed);
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
      showToast(t.toast.exported);
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
        const tree = await chrome.bookmarks.getTree();
        const bookmarkBar = tree.find((n) => n.title === "" || n.id === "0");
        if (bookmarkBar && bookmarkBar.children) {
          await importTree(bookmarkBar.children, bookmarkBar.id);
        } else {
          await importTree(data, "1");
        }
        loadBookmarks();
        showToast(t.toast.imported);
      } catch (err) {
        console.error("Failed to import:", err);
        showToast(t.toast.importFailed);
      }
    };
    input.click();
  };

  const changeColumnFolderDirect = (columnId: string, newFolderId: string) => {
    getTree().then((tree) => {
      const parentChain = buildParentChain(tree, newFolderId);
      const folder = allFolders.find((f) => f.id === newFolderId);
      const title =
        parentChain.length > 0
          ? parentChain[parentChain.length - 1].title
          : folder?.title || "Unknown";
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
          if (expanded.has(folderId)) expanded.delete(folderId);
          else expanded.add(folderId);
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
      if (newSet.has(bookmarkId)) newSet.delete(bookmarkId);
      else newSet.add(bookmarkId);
      return newSet;
    });
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragTargetColumn(columnId);
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

  const moveSingleBookmark = async (
    bookmarkId: string,
    targetColumnId: string,
    targetIndex: number
  ) => {
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;
    try {
      await moveBookmark(bookmarkId, targetColumn.folderId, targetIndex);
      loadBookmarks();
      setSelectedIds(new Set());
      showToast(t.toast.bookmarkMoved);
    } catch (err) {
      console.error("Failed to move bookmark:", err);
    }
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
    showToast(t.toast.bookmarksMoved);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const lastRecord = undoStack[undoStack.length - 1];
    try {
      await moveBookmark(lastRecord.bookmarkId, lastRecord.fromParentId, lastRecord.fromIndex);
      setUndoStack((prev) => prev.slice(0, -1));
      loadBookmarks();
      showToast(t.toast.undoSuccessful);
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

  const toggleLocale = () => {
    setLocale(locale === "en" ? "zh" : "en");
  };

  if (columns.length === 0) {
    return (
      <div className="app">
        <div className="loading">{t.app.loading}</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <h1 className="title">{t.app.title}</h1>
          <button onClick={addColumn} className="btn btn-success">
            <IconPlus />
            {t.header.addColumn}
          </button>
          <button onClick={showClearEmptyModal} className="btn btn-warning">
            <IconBroom />
            {t.header.clearEmpty}
          </button>
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} className="btn btn-danger">
              <IconTrash />
              {tr(t.header.deleteSelected, { count: selectedIds.size })}
            </button>
          )}
          <button onClick={handleImport} className="btn btn-ghost">
            <IconUpload />
            {t.header.import}
          </button>
          <button onClick={handleExport} className="btn btn-ghost">
            <IconDownload />
            {t.header.export}
          </button>
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="btn btn-ghost"
          >
            <IconUndo />
            {tr(t.header.undo, { count: undoStack.length })}
          </button>
        </div>

        <div className="header-right">
          <div className="toggle-group">
            <button
              className={`toggle-btn${locale === "en" ? " active" : ""}`}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
            <button
              className={`toggle-btn${locale === "zh" ? " active" : ""}`}
              onClick={() => setLocale("zh")}
            >
              中
            </button>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="selection-bar">
          {tr(t.selection.count, { count: selectedIds.size })} &mdash; {t.selection.dropHint}
        </div>
      )}

      {/* Columns */}
      <div className="columns-container">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`column${dragTargetColumn === column.id ? " drag-over" : ""}`}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragLeave={() => setDragTargetColumn(null)}
            onDrop={(e) => handleColumnDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="column-header">
              <div className="column-nav">
                {column.parentChain.length > 1 && (
                  <button onClick={() => goBack(column.id)} className="back-btn" title="Go back">
                    <IconArrowLeft />
                  </button>
                )}
                <span className="folder-path">
                  {column.parentChain.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && <span className="path-separator"> / </span>}
                      <span
                        className={i === column.parentChain.length - 1 ? "current-folder" : "parent-folder"}
                        onClick={() => {
                          if (i < column.parentChain.length - 1) {
                            changeColumnFolderDirect(column.id, p.id);
                          }
                        }}
                      >
                        {p.title}
                      </span>
                    </span>
                  ))}
                </span>
              </div>
              <div className="column-actions">
                <button
                  onClick={() => createNewFolder(column.id)}
                  className="btn btn-ghost btn-icon"
                  title={t.column.newFolder}
                >
                  <IconFolderPlus />
                </button>
                <button
                  onClick={() => {
                    const currentTitle =
                      column.parentChain.length > 0
                        ? column.parentChain[column.parentChain.length - 1].title
                        : column.folderTitle;
                    setPromptModal({
                      type: "renameFolder",
                      data: { id: column.folderId, title: currentTitle },
                    });
                  }}
                  className="btn btn-ghost btn-icon"
                  title={t.column.renameFolder}
                >
                  <IconEdit />
                </button>
                <button
                  onClick={(e) => deleteCurrentFolder(column.id, e)}
                  className="btn btn-ghost btn-icon"
                  title={t.column.deleteFolder}
                >
                  <IconTrash />
                </button>
                {columns.length > 2 && (
                  <button
                    onClick={() => removeColumn(column.id)}
                    className="btn btn-ghost btn-icon"
                    title={t.column.removeColumn}
                  >
                    <IconX />
                  </button>
                )}
              </div>
            </div>

            {/* Bookmark Tree */}
            <div className="bookmark-tree">
              <TreeView
                nodes={column.tree}
                expandedFolders={column.expandedFolders}
                selectedIds={selectedIds}
                onToggle={(id) => toggleFolder(column.id, id)}
                onSelect={toggleSelect}
                getFaviconUrl={getFaviconUrl}
                onNavigate={(folderId) => changeColumnFolderDirect(column.id, folderId)}
                onRename={(id, title) => {
                  setPromptModal({ type: "renameBookmark", data: { id, title } });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showEmptyModal && (
        <EmptyFolderModal
          emptyFolders={emptyFolders}
          onDelete={handleDeleteEmptyFolders}
          onClose={() => setShowEmptyModal(false)}
        />
      )}

      {promptModal && (
        <PromptModal
          title={
            promptModal.type === "createFolder"
              ? t.modal.prompt.newFolder
              : t.modal.prompt.rename
          }
          defaultValue={
            promptModal.type === "renameFolder"
              ? promptModal.data.title || ""
              : promptModal.type === "renameBookmark"
                ? promptModal.data.title || ""
                : ""
          }
          onSubmit={handlePromptSubmit}
          onCancel={() => setPromptModal(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
