import type { BookmarkNode } from "../types";
import { useI18n } from "../context/I18nContext";
import { IconChevronRight, IconChevronDown, IconFolder, IconEdit } from "./Icons";

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

export function TreeView({
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
  const { t } = useI18n();

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
                className="folder-item"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) {
                    onToggle(node.id);
                  }
                  onNavigate?.(node.id);
                }}
              >
                <span className="expand-icon">
                  {hasChildren ? (
                    isExpanded ? <IconChevronDown /> : <IconChevronRight />
                  ) : null}
                </span>
                <IconFolder />
                <span className="folder-name">{node.title || t.tree.root}</span>
                {onRename && (
                  <button
                    className="rename-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(node.id, node.title || "");
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
            className={`bookmark-item${selectedIds.has(node.id) ? " selected" : ""}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", node.id);
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(node.id)}
              onChange={() => onSelect(node.id)}
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
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bookmark-link"
              onClick={(e) => e.stopPropagation()}
            >
              {node.title || node.url}
            </a>
            <button
              className="rename-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRename?.(node.id, node.title || "", node.url || "");
              }}
              title={t.tree.rename}
            >
              <IconEdit />
            </button>
          </div>
        );
      })}
    </div>
  );
}
