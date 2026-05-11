import { useState } from "react";
import type { BookmarkNode } from "../types";
import { useI18n } from "../context/I18nContext";
import { IconChevronRight, IconChevronDown, IconFolder, IconEdit } from "./Icons";

const BOOKMARK_DND_TYPE = "application/x-bookmark-id";

interface TreeViewProps {
  nodes: BookmarkNode[];
  expandedFolders: Set<string>;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  getFaviconUrl: (url: string) => string;
  onNavigate?: (folderId: string) => void;
  onRenameFolder?: (id: string, title: string) => void;
  onEditBookmark?: (node: BookmarkNode) => void;
  onShowDetails?: (node: BookmarkNode) => void;
  onMove?: (bookmarkId: string, targetFolderId: string, targetIndex: number) => void;
  depth?: number;
  parentFolderId?: string;
}

export function TreeView({
  nodes,
  expandedFolders,
  selectedIds,
  onToggle,
  onSelect,
  getFaviconUrl,
  onNavigate,
  onRenameFolder,
  onEditBookmark,
  onShowDetails,
  onMove,
  depth = 0,
  parentFolderId,
}: TreeViewProps) {
  const { t } = useI18n();
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);

  return (
    <div style={{ paddingLeft: depth * 16 + "px" }}>
      {nodes.map((node, index) => {
        const isFolder = !node.url;
        const isExpanded = expandedFolders.has(node.id);

        if (isFolder) {
          const hasChildren = node.children && node.children.length > 0;
          return (
            <div key={node.id}>
              <div
                className={`folder-item${dropFolderId === node.id ? " folder-drop-target" : ""}`}
                onDragOver={(e) => {
                  const bookmarkId = e.dataTransfer.getData(BOOKMARK_DND_TYPE) || e.dataTransfer.getData("text/plain");
                  if (bookmarkId === node.id) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropFolderId(node.id);
                }}
                onDragLeave={() => setDropFolderId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const bookmarkId = e.dataTransfer.getData(BOOKMARK_DND_TYPE) || e.dataTransfer.getData("text/plain");
                  setDropFolderId(null);
                  if (bookmarkId && bookmarkId !== node.id) onMove?.(bookmarkId, node.id, node.children?.length || 0);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) onToggle(node.id);
                  onNavigate?.(node.id);
                }}
              >
                <span className="expand-icon">
                  {hasChildren ? (isExpanded ? <IconChevronDown /> : <IconChevronRight />) : null}
                </span>
                <IconFolder />
                <span className="folder-name">{node.title || t.tree.root}</span>
                {onRenameFolder && (
                  <button
                    className="rename-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenameFolder(node.id, node.title || "");
                    }}
                    title={t.tree.rename}
                  >
                    <IconEdit />
                  </button>
                )}
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
                  onRenameFolder={onRenameFolder}
                  onEditBookmark={onEditBookmark}
                  onShowDetails={onShowDetails}
                  onMove={onMove}
                  depth={depth + 1}
                  parentFolderId={node.id}
                />
              )}
            </div>
          );
        }

        return (
          <div key={node.id}>
            {dropIndex === index && <div className="drop-indicator" />}
            <div
              className={`bookmark-item${selectedIds.has(node.id) ? " selected" : ""}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(BOOKMARK_DND_TYPE, node.id);
                e.dataTransfer.setData("text/plain", node.id);
              }}
              onDragOver={(e) => {
                if (!parentFolderId) return;
                e.preventDefault();
                setDropIndex(index);
              }}
              onDragLeave={() => setDropIndex(null)}
              onDrop={(e) => {
                if (!parentFolderId) return;
                e.preventDefault();
                e.stopPropagation();
                const bookmarkId = e.dataTransfer.getData(BOOKMARK_DND_TYPE) || e.dataTransfer.getData("text/plain");
                setDropIndex(null);
                if (bookmarkId) onMove?.(bookmarkId, parentFolderId, index);
              }}
              onClick={() => onShowDetails?.(node)}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(node.id)}
                onChange={() => onSelect(node.id)}
                onClick={(e) => e.stopPropagation()}
                className="checkbox"
              />
              <img
                src={getFaviconUrl(node.url!)}
                alt=""
                className="favicon"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="bookmark-title-cell">
                <a
                  href={node.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bookmark-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {node.title || node.url}
                </a>
              </span>
              <button
                className="rename-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBookmark?.(node);
                }}
                title={t.tree.rename}
              >
                <IconEdit />
              </button>
            </div>
          </div>
        );
      })}
      {dropIndex === nodes.length && <div className="drop-indicator" />}
    </div>
  );
}
