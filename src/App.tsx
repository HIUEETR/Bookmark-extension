import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BatchMoveRecord,
  BookmarkDetail,
  BookmarkNode,
  BrokenBookmarkResult,
  ColumnData,
  ConfirmState,
  DuplicateGroup,
  FolderOption,
  PromptState,
  SavedState,
  TrashEntry,
} from "./types";
import {
  createFolder,
  getImportedBookmarksFolderId,
  getTree,
  moveBookmark,
  removeBookmark,
  removeTree,
  updateBookmark,
} from "./lib/bookmarks";
import {
  buildParentChain,
  calculateStats,
  extractAllFolders,
  filterTree,
  findDuplicateBookmarks,
  findEmptyFoldersInTree,
  findFolderTree,
  findNodeById,
  findNodePath,
  getRootFolders,
  searchBookmarks,
  serializeColumns,
} from "./lib/bookmarkTree";
import { exportHtml, exportJson, importNodes, parseBookmarkFile } from "./lib/importExport";
import { addTrashEntries, checkBrokenBookmarks, getTrashEntries } from "./lib/cleanup";
import { readStorage, writeStorage } from "./lib/storage";
import { useI18n } from "./context/I18nContext";
import { useTheme } from "./context/ThemeContext";
import { Toast } from "./components/Toast";
import { PromptModal } from "./components/PromptModal";
import { EmptyFolderModal } from "./components/EmptyFolderModal";
import { TreeView } from "./components/TreeView";
import { ConfirmModal } from "./components/ConfirmModal";
import { BookmarkEditModal } from "./components/BookmarkEditModal";
import { SearchBar } from "./components/SearchBar";
import { FolderPickerModal } from "./components/FolderPickerModal";
import { BookmarkDetailsPanel } from "./components/BookmarkDetailsPanel";
import { DuplicateBookmarksModal } from "./components/DuplicateBookmarksModal";
import { BrokenBookmarksModal } from "./components/BrokenBookmarksModal";
import { StatsPanel } from "./components/StatsPanel";
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
} from "./components/Icons";
import "./styles/app.css";

const STATE_KEY = "my-bookmark-state";
const MIN_COLUMN_WIDTH = 280;
const MAX_COLUMN_WIDTH = 560;
const DEFAULT_COLUMN_WIDTH = 340;
const COLUMN_DND_TYPE = "application/x-bookmark-column-id";
const BOOKMARK_DND_TYPE = "application/x-bookmark-id";

function clampColumnWidth(width: number | undefined): number {
  if (typeof width !== "number" || Number.isNaN(width)) return DEFAULT_COLUMN_WIDTH;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width));
}

export default function App() {
  const { t, localeSetting, setLocaleSetting } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [allFolders, setAllFolders] = useState<FolderOption[]>([]);
  const [undoStack, setUndoStack] = useState<BatchMoveRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragTargetColumn, setDragTargetColumn] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [columnDropTargetId, setColumnDropTargetId] = useState<string | null>(null);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const columnsRef = useRef<ColumnData[]>([]);
  const [emptyFolders, setEmptyFolders] = useState<FolderOption[]>([]);
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [promptModal, setPromptModal] = useState<PromptState | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
  const [bookmarkEdit, setBookmarkEdit] = useState<BookmarkNode | null>(null);
  const [folderPicker, setFolderPicker] = useState<"batchMove" | null>(null);
  const [detail, setDetail] = useState<BookmarkDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateSelection, setDuplicateSelection] = useState<Set<string>>(new Set());
  const [showBroken, setShowBroken] = useState(false);
  const [brokenResults, setBrokenResults] = useState<BrokenBookmarkResult[]>([]);
  const [checkingBroken, setCheckingBroken] = useState(false);
  const [trashEntries, setTrashEntries] = useState<TrashEntry[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => calculateStats(tree), [tree]);
  const searchResults = useMemo(() => searchBookmarks(tree, searchQuery), [tree, searchQuery]);
  const duplicateGroups = useMemo<DuplicateGroup[]>(() => findDuplicateBookmarks(tree), [tree]);

  useEffect(() => {
    void loadInitialState();
  }, []);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const showToast = (message: string) => setToast(message);

  function tr(str: string, vars?: Record<string, string | number>): string {
    if (!vars) return str;
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{{${k}}}`, String(v)), str);
  }

  async function loadInitialState() {
    await loadBookmarks();
  }

  async function loadBookmarks() {
    const nextTree = await getTree();
    const folders = extractAllFolders(nextTree);
    const savedState = await readStorage<SavedState | null>(STATE_KEY, null);
    const nextColumns = buildColumns(nextTree, folders, savedState);
    setTree(nextTree);
    setAllFolders(folders);
    setColumns(nextColumns);
    setTrashEntries(await getTrashEntries());
  }

  async function loadBookmarksWithColumns(folderIds: string[]) {
    const nextTree = await getTree();
    const folders = extractAllFolders(nextTree);
    const validFolderIds = folderIds.filter((id, index) => folderIds.indexOf(id) === index && folders.some((folder) => folder.id === id));
    const fallbackFolderId = validFolderIds[0] ?? folders[0]?.id;
    const selectedFolderIds = validFolderIds.slice(0, 4);
    while (selectedFolderIds.length < 2 && fallbackFolderId) selectedFolderIds.push(fallbackFolderId);
    const nextColumns = selectedFolderIds.map((folderId, index) => {
      const parentChain = buildParentChain(nextTree, folderId);
      const folder = folders.find((item) => item.id === folderId);
      return {
        id: `col-${Date.now()}-${index}`,
        folderId,
        folderTitle: parentChain[parentChain.length - 1]?.title || folder?.title || "Unknown",
        tree: findFolderTree(nextTree, folderId) || [],
        expandedFolders: new Set<string>(),
        parentChain,
        width: DEFAULT_COLUMN_WIDTH,
      };
    });
    setTree(nextTree);
    setAllFolders(folders);
    setColumns(nextColumns);
    await saveColumns(nextColumns);
    setTrashEntries(await getTrashEntries());
  }

  function buildColumns(nextTree: BookmarkNode[], folders: FolderOption[], savedState: SavedState | null): ColumnData[] {
    if (savedState && savedState.columns.length >= 2) {
      const restored = savedState.columns
        .filter((col) => folders.some((folder) => folder.id === col.folderId))
        .map((col) => {
          const folder = folders.find((f) => f.id === col.folderId);
          return {
            id: col.id,
            folderId: col.folderId,
            folderTitle: folder?.title || col.folderTitle,
            tree: findFolderTree(nextTree, col.folderId) || [],
            expandedFolders: new Set(col.expandedFolders),
            parentChain: buildParentChain(nextTree, col.folderId),
            width: clampColumnWidth(col.width),
          };
        });
      if (restored.length >= 2) return restored;
    }

    return getRootFolders(nextTree).slice(0, 2).map((folder, index) => ({
      id: `col-${Date.now()}-${index}`,
      folderId: folder.id,
      folderTitle: folder.title || "Bookmark Bar",
      tree: folder.children || [],
      expandedFolders: new Set<string>(),
      parentChain: [{ id: folder.id, title: folder.title || "Bookmark Bar" }],
      width: DEFAULT_COLUMN_WIDTH,
    }));
  }

  async function saveColumns(nextColumns: ColumnData[]) {
    await writeStorage<SavedState>(STATE_KEY, { columns: serializeColumns(nextColumns) });
  }

  const addColumn = async () => {
    const usedFolderIds = new Set(columns.map((c) => c.folderId));
    const available = allFolders.filter((f) => !usedFolderIds.has(f.id));
    if (available.length === 0) return;
    const newFolder = available.find((folder) => (findFolderTree(tree, folder.id) || []).length > 0) || available[0];
    const nextColumn: ColumnData = {
      id: `col-${Date.now()}`,
      folderId: newFolder.id,
      folderTitle: newFolder.title,
      tree: findFolderTree(tree, newFolder.id) || [],
      expandedFolders: new Set(),
      parentChain: buildParentChain(tree, newFolder.id),
      width: DEFAULT_COLUMN_WIDTH,
    };
    const nextColumns = [...columns, nextColumn];
    setColumns(nextColumns);
    await saveColumns(nextColumns);
  };

  const removeColumn = async (columnId: string) => {
    if (columns.length <= 2) return;
    const nextColumns = columns.filter((c) => c.id !== columnId);
    setColumns(nextColumns);
    await saveColumns(nextColumns);
  };

  const showClearEmptyModal = async () => {
    setEmptyFolders(findEmptyFoldersInTree(await getTree()));
    setShowEmptyModal(true);
  };

  const handleDeleteEmptyFolders = async (ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmModal({
      title: t.modal.emptyFolders.title,
      message: tr(t.confirm.deleteSelectedFolders, { count: ids.length }),
      confirmLabel: t.common.delete,
      danger: true,
      onConfirm: async () => {
        await deleteIds(ids);
        setShowEmptyModal(false);
        showToast(tr(t.toast.deletedEmpty, { count: ids.length }));
      },
    });
  };

  const handlePromptSubmit = async (value: string) => {
    if (!promptModal) return;
    const trimmed = value.trim();
    if (!trimmed) {
      setPromptModal(null);
      return;
    }
    try {
      setBusy(true);
      if (promptModal.type === "createFolder") {
        const column = columns.find((c) => c.id === promptModal.columnId);
        if (!column) return;
        await createFolder({ parentId: column.folderId, title: trimmed });
        showToast(t.toast.folderCreated);
      } else {
        await updateBookmark(promptModal.id, { title: trimmed });
        showToast(t.toast.folderRenamed);
      }
      setPromptModal(null);
      await loadBookmarks();
    } catch {
      showToast(t.toast.operationFailed);
    } finally {
      setBusy(false);
    }
  };

  const deleteCurrentFolder = (columnId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.size > 0) {
      requestDeleteSelected();
      return;
    }
    const column = columns.find((c) => c.id === columnId);
    if (!column) return;
    const currentTitle = column.parentChain[column.parentChain.length - 1]?.title || column.folderTitle;
    const hasContent = column.tree.some((node) => node.url || (node.children && node.children.length > 0));
    setConfirmModal({
      title: t.confirm.deleteFolderTitle,
      message: hasContent
        ? tr(t.confirm.deleteFolderWithContents, { name: currentTitle })
        : tr(t.confirm.deleteFolder, { name: currentTitle }),
      confirmLabel: t.common.delete,
      danger: true,
      requireText: hasContent ? currentTitle : undefined,
      onConfirm: async () => {
        const latestTree = await getTree();
        const node = findNodeById(latestTree, column.folderId);
        if (node) await addTrashEntries([node]);
        await removeTree(column.folderId);
        await loadBookmarks();
        showToast(t.toast.folderDeleted);
      },
    });
  };

  function requestDeleteSelected() {
    if (selectedIds.size === 0) return;
    setConfirmModal({
      title: t.confirm.deleteSelectedTitle,
      message: tr(t.confirm.deleteSelected, { count: selectedIds.size }),
      confirmLabel: t.common.delete,
      danger: true,
      onConfirm: async () => {
        await deleteIds(Array.from(selectedIds));
        setSelectedIds(new Set());
        showToast(tr(t.toast.deletedItems, { count: selectedIds.size }));
      },
    });
  }

  async function deleteIds(ids: string[]) {
    setBusy(true);
    try {
      const latestTree = await getTree();
      const nodes = getTopLevelSelectedNodes(latestTree, ids);
      if (nodes.length > 0) await addTrashEntries(nodes);
      for (const node of nodes) {
        if (node.url) await removeBookmark(node.id);
        else await removeTree(node.id);
      }
      await loadBookmarks();
    } catch {
      showToast(t.toast.deleteItemsFailed);
    } finally {
      setBusy(false);
    }
  }

  function getTopLevelSelectedNodes(latestTree: BookmarkNode[], ids: string[]): BookmarkNode[] {
    const selected = new Set(ids);
    const result: BookmarkNode[] = [];
    const visit = (node: BookmarkNode, hasSelectedAncestor: boolean) => {
      const isSelected = selected.has(node.id);
      if (isSelected && !hasSelectedAncestor) result.push(node);
      if (node.children) {
        for (const child of node.children) visit(child, hasSelectedAncestor || isSelected);
      }
    };
    for (const node of latestTree) visit(node, false);
    return result;
  }


  const handleExport = async (format: "json" | "html") => {
    const latestTree = await getTree();
    const blob = format === "json" ? exportJson(latestTree) : exportHtml(latestTree);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookmarks-export-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t.toast.exported);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.html,.htm";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        setBusy(true);
        const nodes = parseBookmarkFile(await file.text(), file.name);
        const importFolderId = await getImportedBookmarksFolderId();
        const importedNodes = await importNodes(nodes, importFolderId);
        const importedFolderIds = importedNodes.filter((node) => node.children && node.children.length > 0).map((node) => node.id);
        await loadBookmarksWithColumns([importFolderId, ...importedFolderIds]);
        showToast(t.toast.imported);
      } catch {
        showToast(t.toast.importFailed);
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  const changeColumnFolderDirect = async (columnId: string, newFolderId: string) => {
    const latestTree = await getTree();
    setTree(latestTree);
    const parentChain = buildParentChain(latestTree, newFolderId);
    const folder = extractAllFolders(latestTree).find((f) => f.id === newFolderId);
    const nextColumns = columns.map((col) =>
      col.id === columnId
        ? {
            ...col,
            folderId: newFolderId,
            folderTitle: parentChain[parentChain.length - 1]?.title || folder?.title || "Unknown",
            tree: findFolderTree(latestTree, newFolderId) || [],
            expandedFolders: new Set<string>(),
            parentChain,
          }
        : col
    );
    setColumns(nextColumns);
    await saveColumns(nextColumns);
  };

  const goBack = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (!column || column.parentChain.length <= 1) return;
    void changeColumnFolderDirect(columnId, column.parentChain[column.parentChain.length - 2].id);
  };

  const toggleFolder = async (columnId: string, folderId: string) => {
    const nextColumns = columns.map((col) => {
      if (col.id !== columnId) return col;
      const expanded = new Set(col.expandedFolders);
      if (expanded.has(folderId)) expanded.delete(folderId);
      else expanded.add(folderId);
      return { ...col, expandedFolders: expanded };
    });
    setColumns(nextColumns);
    await saveColumns(nextColumns);
  };

  const toggleSelect = (bookmarkId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookmarkId)) next.delete(bookmarkId);
      else next.add(bookmarkId);
      return next;
    });
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (Array.from(e.dataTransfer.types).includes(COLUMN_DND_TYPE)) {
      setColumnDropTargetId(columnId);
      setDragTargetColumn(null);
    } else {
      setDragTargetColumn(columnId);
    }
  };

  const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragTargetColumn(null);
    setColumnDropTargetId(null);
    const draggedColumnId = e.dataTransfer.getData(COLUMN_DND_TYPE);
    if (draggedColumnId) {
      if (draggedColumnId === targetColumnId) return;
      const fromIndex = columns.findIndex((c) => c.id === draggedColumnId);
      const toIndex = columns.findIndex((c) => c.id === targetColumnId);
      if (fromIndex < 0 || toIndex < 0) return;
      const nextColumns = [...columns];
      const [movedColumn] = nextColumns.splice(fromIndex, 1);
      nextColumns.splice(toIndex, 0, movedColumn);
      setColumns(nextColumns);
      await saveColumns(nextColumns);
      return;
    }

    const bookmarkId = e.dataTransfer.getData(BOOKMARK_DND_TYPE) || e.dataTransfer.getData("text/plain");
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (!targetColumn || !bookmarkId) return;
    if (selectedIds.has(bookmarkId)) await moveSelectedBookmarks(targetColumn.folderId, targetColumn.tree.length);
    else await moveSingleBookmark(bookmarkId, targetColumn.folderId, targetColumn.tree.length);
  };

  const startColumnDrag = (e: React.DragEvent, columnId: string) => {
    e.dataTransfer.setData(COLUMN_DND_TYPE, columnId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingColumnId(columnId);
  };

  const handleColumnDragEnd = () => {
    setDraggingColumnId(null);
    setColumnDropTargetId(null);
  };

  const resizeColumn = (columnId: string, width: number) => {
    const nextWidth = clampColumnWidth(width);
    setColumns((currentColumns) => {
      const nextColumns = currentColumns.map((column) => (column.id === columnId ? { ...column, width: nextWidth } : column));
      columnsRef.current = nextColumns;
      return nextColumns;
    });
    return nextWidth;
  };

  const startColumnResize = (e: React.PointerEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = clampColumnWidth(columns.find((column) => column.id === columnId)?.width);
    setResizingColumnId(columnId);

    const handlePointerMove = (event: PointerEvent) => {
      resizeColumn(columnId, startWidth + event.clientX - startX);
    };

    const handlePointerUp = () => {
      setResizingColumnId(null);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      void saveColumns(columnsRef.current);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleColumnResizeKeyDown = (e: React.KeyboardEvent, columnId: string) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const direction = e.key === "ArrowRight" ? 1 : -1;
    const step = e.shiftKey ? 40 : 10;
    const currentWidth = clampColumnWidth(columns.find((column) => column.id === columnId)?.width);
    resizeColumn(columnId, currentWidth + direction * step);
    void saveColumns(columnsRef.current);
  };

  async function moveSingleBookmark(bookmarkId: string, targetFolderId: string, targetIndex: number) {
    const latestTree = await getTree();
    const node = findNodeById(latestTree, bookmarkId);
    if (!node?.parentId) return;
    try {
      await moveBookmark(bookmarkId, targetFolderId, targetIndex);
      setUndoStack((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          label: node.title || t.toast.bookmarkMoved,
          records: [{ bookmarkId, fromParentId: node.parentId, fromIndex: node.index || 0, toParentId: targetFolderId, toIndex: targetIndex }],
        },
      ]);
      setSelectedIds(new Set());
      await loadBookmarks();
      showToast(t.toast.bookmarkMoved);
    } catch {
      showToast(t.toast.moveFailed);
    }
  }

  async function moveSelectedBookmarks(targetFolderId: string, targetIndex: number) {
    const latestTree = await getTree();
    const records: BatchMoveRecord["records"] = [];
    try {
      let offset = 0;
      for (const id of selectedIds) {
        const node = findNodeById(latestTree, id);
        if (!node?.parentId) continue;
        await moveBookmark(id, targetFolderId, targetIndex + offset);
        records.push({ bookmarkId: id, fromParentId: node.parentId, fromIndex: node.index || 0, toParentId: targetFolderId, toIndex: targetIndex + offset });
        offset++;
      }
      if (records.length > 0) {
        setUndoStack((prev) => [...prev, { id: `${Date.now()}`, label: tr(t.undo.batch, { count: records.length }), records }]);
      }
      setSelectedIds(new Set());
      await loadBookmarks();
      showToast(t.toast.bookmarksMoved);
    } catch {
      showToast(t.toast.moveFailed);
    }
  }

  const handleUndo = async () => {
    const lastRecord = undoStack[undoStack.length - 1];
    if (!lastRecord) return;
    try {
      for (const record of [...lastRecord.records].reverse()) {
        await moveBookmark(record.bookmarkId, record.fromParentId, record.fromIndex);
      }
      setUndoStack((prev) => prev.slice(0, -1));
      await loadBookmarks();
      showToast(t.toast.undoSuccessful);
    } catch {
      showToast(t.toast.undoFailed);
    }
  };

  const getFaviconUrl = (url: string): string => {
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(url).origin}&sz=32`;
    } catch {
      return "";
    }
  };

  const openDetails = (node: BookmarkNode) => {
    setDetail({ node, path: findNodePath(tree, node.id) });
  };

  const handleEditBookmark = async (value: { title: string; url: string }) => {
    if (!bookmarkEdit) return;
    try {
      await updateBookmark(bookmarkEdit.id, value);
      setBookmarkEdit(null);
      setDetail(null);
      await loadBookmarks();
      showToast(t.toast.bookmarkRenamed);
    } catch {
      showToast(t.toast.operationFailed);
    }
  };

  const handleSearchPick = async (picked: BookmarkDetail) => {
    if (picked.node.parentId && columns[0]) await changeColumnFolderDirect(columns[0].id, picked.node.parentId);
    setDetail(picked);
    setSearchQuery("");
  };

  const handleDuplicateDelete = () => {
    const ids = Array.from(duplicateSelection);
    setConfirmModal({
      title: t.duplicates.title,
      message: tr(t.confirm.deleteSelected, { count: ids.length }),
      confirmLabel: t.common.delete,
      danger: true,
      onConfirm: async () => {
        await deleteIds(ids);
        setDuplicateSelection(new Set());
        setShowDuplicates(false);
      },
    });
  };

  const runBrokenCheck = async () => {
    setCheckingBroken(true);
    setBrokenResults(await checkBrokenBookmarks(await getTree(), selectedIds.size ? selectedIds : undefined));
    setCheckingBroken(false);
  };

  const restoreTrashEntry = async (entry: TrashEntry) => {
    if (!entry.parentId) return;
    await importNodes([{ title: entry.node.title, url: entry.node.url, children: entry.node.children }], entry.parentId);
    const next = trashEntries.filter((item) => item.id !== entry.id);
    setTrashEntries(next);
    await writeStorage("my-bookmark-trash", next);
    await loadBookmarks();
    showToast(t.trash.restored);
  };

  if (columns.length === 0) {
    return <div className="app"><div className="loading">{t.app.loading}</div></div>;
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <h1 className="title">{t.app.title}</h1>
          <button onClick={addColumn} className="btn btn-success" disabled={busy}><IconPlus />{t.header.addColumn}</button>
          <button onClick={showClearEmptyModal} className="btn btn-warning" disabled={busy}><IconBroom />{t.header.clearEmpty}</button>
          {selectedIds.size > 0 && <button onClick={requestDeleteSelected} className="btn btn-danger" disabled={busy}><IconTrash />{tr(t.header.deleteSelected, { count: selectedIds.size })}</button>}
          {selectedIds.size > 0 && <button onClick={() => setFolderPicker("batchMove")} className="btn btn-ghost" disabled={busy}>{t.header.moveTo}</button>}
          <button onClick={handleImport} className="btn btn-ghost" disabled={busy}><IconUpload />{t.header.import}</button>
          <button onClick={() => void handleExport("json")} className="btn btn-ghost"><IconDownload />{t.header.exportJson}</button>
          <button onClick={() => void handleExport("html")} className="btn btn-ghost"><IconDownload />{t.header.exportHtml}</button>
          <button onClick={handleUndo} disabled={undoStack.length === 0 || busy} className="btn btn-ghost"><IconUndo />{tr(t.header.undo, { count: undoStack.length })}</button>
        </div>
        <div className="header-right">
          <button className="btn btn-ghost" onClick={() => setShowDuplicates(true)}>{t.header.duplicates}</button>
          <button className="btn btn-ghost" onClick={() => setShowBroken(true)}>{t.header.broken}</button>
          <button className="btn btn-ghost" onClick={() => setShowTrash(true)}>{t.header.trash} ({trashEntries.length})</button>
          <div className="toggle-group">
            {(["system", "en", "zh"] as const).map((value) => (
              <button key={value} className={`toggle-btn${localeSetting === value ? " active" : ""}`} onClick={() => setLocaleSetting(value)}>
                {value === "system" ? t.header.systemLocale : value === "en" ? "EN" : "中"}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title={t.header.toggleTheme}>{theme === "dark" ? <IconSun /> : <IconMoon />}</button>
        </div>
      </div>

      <div className="toolbar-row">
        <SearchBar value={searchQuery} results={searchResults} onChange={setSearchQuery} onPick={handleSearchPick} />
        <StatsPanel stats={stats} onDuplicates={() => setShowDuplicates(true)} onEmptyFolders={showClearEmptyModal} />
      </div>

      {selectedIds.size > 0 && <div className="selection-bar">{tr(t.selection.count, { count: selectedIds.size })} — {t.selection.dropHint}</div>}

      <div className={`workspace${detail ? " has-details" : ""}`}>
        <div className="columns-container">
          {columns.map((column) => (
            <div
              key={column.id}
              className={`column${dragTargetColumn === column.id ? " drag-over" : ""}${columnDropTargetId === column.id ? " reorder-over" : ""}${draggingColumnId === column.id ? " dragging" : ""}${resizingColumnId === column.id ? " resizing" : ""}`}
              style={{ width: clampColumnWidth(column.width), flex: "0 0 auto" }}
              onDragOver={(e) => handleColumnDragOver(e, column.id)}
              onDragLeave={() => {
                setDragTargetColumn(null);
                setColumnDropTargetId(null);
              }}
              onDrop={(e) => void handleColumnDrop(e, column.id)}
            >
              <div className="column-header">
                <button
                  className="column-drag-handle"
                  draggable
                  onDragStart={(e) => startColumnDrag(e, column.id)}
                  onDragEnd={handleColumnDragEnd}
                  title={t.column.dragHandle}
                  aria-label={t.column.dragHandle}
                />
                <div className="column-nav">
                  {column.parentChain.length > 1 && <button onClick={() => goBack(column.id)} className="back-btn" title={t.column.goBack}><IconArrowLeft /></button>}
                  <span className="folder-path">
                    {column.parentChain.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && <span className="path-separator"> / </span>}
                        <span className={i === column.parentChain.length - 1 ? "current-folder" : "parent-folder"} onClick={() => i < column.parentChain.length - 1 && void changeColumnFolderDirect(column.id, p.id)}>{p.title}</span>
                      </span>
                    ))}
                  </span>
                </div>
                <div className="column-actions">
                  <button onClick={() => setPromptModal({ type: "createFolder", columnId: column.id })} className="btn btn-ghost btn-icon" title={t.column.newFolder}><IconFolderPlus /></button>
                  <button onClick={() => setPromptModal({ type: "renameFolder", id: column.folderId, title: column.parentChain[column.parentChain.length - 1]?.title || column.folderTitle })} className="btn btn-ghost btn-icon" title={t.column.renameFolder}><IconEdit /></button>
                  <button onClick={(e) => deleteCurrentFolder(column.id, e)} className="btn btn-ghost btn-icon" title={t.column.deleteFolder}><IconTrash /></button>
                  {columns.length > 2 && <button onClick={() => void removeColumn(column.id)} className="btn btn-ghost btn-icon" title={t.column.removeColumn}><IconX /></button>}
                </div>
              </div>
              <div className="bookmark-tree">
                <TreeView
                  nodes={filterTree(column.tree, searchQuery)}
                  expandedFolders={column.expandedFolders}
                  selectedIds={selectedIds}
                  onToggle={(id) => void toggleFolder(column.id, id)}
                  onSelect={toggleSelect}
                  getFaviconUrl={getFaviconUrl}
                  onNavigate={(folderId) => void changeColumnFolderDirect(column.id, folderId)}
                  onRenameFolder={(id, title) => setPromptModal({ type: "renameFolder", id, title })}
                  onEditBookmark={setBookmarkEdit}
                  onShowDetails={openDetails}
                  onMove={(bookmarkId, targetFolderId, targetIndex) => {
                    if (selectedIds.has(bookmarkId)) void moveSelectedBookmarks(targetFolderId, targetIndex);
                    else void moveSingleBookmark(bookmarkId, targetFolderId, targetIndex);
                  }}
                  parentFolderId={column.folderId}
                />
              </div>
              <div
                className="column-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label={t.column.resizeHandle}
                aria-valuemin={MIN_COLUMN_WIDTH}
                aria-valuemax={MAX_COLUMN_WIDTH}
                aria-valuenow={clampColumnWidth(column.width)}
                tabIndex={0}
                onPointerDown={(e) => startColumnResize(e, column.id)}
                onKeyDown={(e) => handleColumnResizeKeyDown(e, column.id)}
              />
            </div>
          ))}
        </div>
        <BookmarkDetailsPanel detail={detail} onClose={() => setDetail(null)} onEdit={() => detail && setBookmarkEdit(detail.node)} />
      </div>

      {showEmptyModal && <EmptyFolderModal emptyFolders={emptyFolders} onDelete={handleDeleteEmptyFolders} onClose={() => setShowEmptyModal(false)} />}
      {promptModal && <PromptModal title={promptModal.type === "createFolder" ? t.modal.prompt.newFolder : t.modal.prompt.rename} defaultValue={promptModal.type === "renameFolder" ? promptModal.title : ""} onSubmit={(value) => void handlePromptSubmit(value)} onCancel={() => setPromptModal(null)} />}
      {confirmModal && <ConfirmModal state={confirmModal} onClose={() => setConfirmModal(null)} />}
      {bookmarkEdit && <BookmarkEditModal title={bookmarkEdit.title} url={bookmarkEdit.url || ""} onSubmit={(value) => void handleEditBookmark(value)} onCancel={() => setBookmarkEdit(null)} />}
      {folderPicker && <FolderPickerModal folders={allFolders} title={t.modal.folderPicker.title} onPick={(folderId) => { setFolderPicker(null); void moveSelectedBookmarks(folderId, 0); }} onClose={() => setFolderPicker(null)} />}
      {showDuplicates && <DuplicateBookmarksModal groups={duplicateGroups} selectedIds={duplicateSelection} onToggle={(id) => setDuplicateSelection((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onDelete={handleDuplicateDelete} onClose={() => setShowDuplicates(false)} />}
      {showBroken && <BrokenBookmarksModal results={brokenResults} loading={checkingBroken} onCheck={() => void runBrokenCheck()} onClose={() => setShowBroken(false)} />}
      {showTrash && (
        <div className="modal-overlay" onClick={() => setShowTrash(false)}>
          <div className="empty-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 className="empty-modal-title">{t.trash.title}</h2>
            <div className="picker-list">
              {trashEntries.length === 0 ? <div className="empty-modal-empty">{t.trash.empty}</div> : trashEntries.map((entry) => (
                <div className="layout-item" key={entry.id}>
                  <div className="picker-item"><strong>{entry.title}</strong><span>{new Date(entry.deletedAt).toLocaleString()}</span></div>
                  <button className="btn btn-primary" onClick={() => void restoreTrashEntry(entry)}>{t.trash.restore}</button>
                </div>
              ))}
            </div>
            <div className="empty-modal-actions"><button className="btn btn-ghost" onClick={() => setShowTrash(false)}>{t.common.close}</button></div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
