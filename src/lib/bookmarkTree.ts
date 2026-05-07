import type { BookmarkDetail, BookmarkNode, BookmarkStats, DuplicateGroup, FolderOption } from "../types";

export function getRootFolders(nodes: BookmarkNode[]): BookmarkNode[] {
  for (const node of nodes) {
    if (node.id === "0" && node.children) return node.children.filter((n) => !n.url);
  }
  return nodes.filter((n) => !n.url);
}

export function extractAllFolders(nodes: BookmarkNode[], pathPrefix = ""): FolderOption[] {
  const result: FolderOption[] = [];
  for (const node of nodes) {
    if (node.id === "0" && node.children) {
      result.push(...extractAllFolders(node.children, ""));
    } else if (!node.url && node.id !== "0") {
      const path = pathPrefix ? `${pathPrefix} / ${node.title}` : node.title || "(root)";
      result.push({ id: node.id, title: node.title || "(root)", path });
      if (node.children) result.push(...extractAllFolders(node.children, path));
    }
  }
  return result;
}

export function findFolderTree(tree: BookmarkNode[], folderId: string): BookmarkNode[] | null {
  for (const node of tree) {
    if (node.id === folderId) return node.children || [];
    if (node.children) {
      const found = findFolderTree(node.children, folderId);
      if (found) return found;
    }
  }
  return null;
}

export function findNodeById(tree: BookmarkNode[], id: string): BookmarkNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function buildParentChain(tree: BookmarkNode[], folderId: string): { id: string; title: string }[] {
  const chain: { id: string; title: string }[] = [];
  const find = (
    nodes: BookmarkNode[],
    target: string,
    path: { id: string; title: string }[]
  ): boolean => {
    for (const node of nodes) {
      const currentPath = [...path, { id: node.id, title: node.title || "(root)" }];
      if (node.id === target) {
        chain.push(...currentPath.filter((item) => item.id !== "0"));
        return true;
      }
      if (node.children && find(node.children, target, currentPath)) return true;
    }
    return false;
  };
  find(tree, folderId, []);
  return chain;
}

export function findNodePath(tree: BookmarkNode[], nodeId: string): string {
  const path: string[] = [];
  const find = (nodes: BookmarkNode[], current: string[]): boolean => {
    for (const node of nodes) {
      const next = node.id === "0" ? current : [...current, node.title || "(root)"];
      if (node.id === nodeId) {
        path.push(...next);
        return true;
      }
      if (node.children && find(node.children, next)) return true;
    }
    return false;
  };
  find(tree, []);
  return path.join(" / ");
}

export function isFolderEmpty(node: BookmarkNode): boolean {
  if (node.url) return false;
  if (!node.children || node.children.length === 0) return true;
  const hasDirectBookmarks = node.children.some((child) => child.url);
  if (hasDirectBookmarks) return false;
  return node.children.every((child) => isFolderEmpty(child));
}

export function findEmptyFoldersInTree(tree: BookmarkNode[]): FolderOption[] {
  const result: FolderOption[] = [];
  const traverse = (nodes: BookmarkNode[], path: string) => {
    for (const node of nodes) {
      if (node.id === "0") {
        if (node.children) traverse(node.children, path);
        continue;
      }
      if (!node.url) {
        const nodePath = path ? `${path} / ${node.title}` : node.title || "(root)";
        if (isFolderEmpty(node)) result.push({ id: node.id, title: node.title || "(root)", path: nodePath });
        if (node.children) traverse(node.children, nodePath);
      }
    }
  };
  traverse(tree, "");
  return result;
}

export function flattenBookmarks(tree: BookmarkNode[]): BookmarkDetail[] {
  const result: BookmarkDetail[] = [];
  const traverse = (nodes: BookmarkNode[], path: string[]) => {
    for (const node of nodes) {
      if (node.id === "0") {
        if (node.children) traverse(node.children, path);
        continue;
      }
      const nextPath = [...path, node.title || "(root)"];
      if (node.url) result.push({ node, path: nextPath.join(" / ") });
      if (node.children) traverse(node.children, nextPath);
    }
  };
  traverse(tree, []);
  return result;
}

export function filterTree(nodes: BookmarkNode[], query: string): BookmarkNode[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return nodes;
  const result: BookmarkNode[] = [];
  for (const node of nodes) {
    const ownMatch = `${node.title} ${node.url || ""}`.toLowerCase().includes(trimmed);
    const children = node.children ? filterTree(node.children, query) : undefined;
    if (ownMatch || (children && children.length > 0)) result.push({ ...node, children });
  }
  return result;
}

export function searchBookmarks(tree: BookmarkNode[], query: string): BookmarkDetail[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  return flattenBookmarks(tree)
    .filter(({ node, path }) => `${node.title} ${node.url || ""} ${path}`.toLowerCase().includes(trimmed))
    .slice(0, 100);
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/$/, "");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "");
  }
}

export function findDuplicateBookmarks(tree: BookmarkNode[]): DuplicateGroup[] {
  const groups = new Map<string, BookmarkDetail[]>();
  for (const detail of flattenBookmarks(tree)) {
    if (!detail.node.url) continue;
    const key = normalizeUrl(detail.node.url);
    groups.set(key, [...(groups.get(key) || []), detail]);
  }
  return Array.from(groups.entries())
    .filter(([, items]) => items.length > 1)
    .map(([url, items]) => ({ url, items }));
}

export function calculateStats(tree: BookmarkNode[]): BookmarkStats {
  let bookmarks = 0;
  let folders = 0;
  const domains = new Map<string, number>();

  const traverse = (nodes: BookmarkNode[]) => {
    for (const node of nodes) {
      if (node.id === "0") {
        if (node.children) traverse(node.children);
        continue;
      }
      if (node.url) {
        bookmarks++;
        try {
          const domain = new URL(node.url).hostname.replace(/^www\./, "");
          domains.set(domain, (domains.get(domain) || 0) + 1);
        } catch {
          continue;
        }
      } else {
        folders++;
        if (node.children) traverse(node.children);
      }
    }
  };

  traverse(tree);
  return {
    bookmarks,
    folders,
    emptyFolders: findEmptyFoldersInTree(tree).length,
    duplicateUrls: findDuplicateBookmarks(tree).length,
    topDomains: Array.from(domains.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count })),
  };
}

export function serializeColumns(columns: import("../types").ColumnData[]): import("../types").SavedColumn[] {
  return columns.map((col) => ({
    id: col.id,
    folderId: col.folderId,
    folderTitle: col.folderTitle,
    expandedFolders: Array.from(col.expandedFolders),
    parentChain: col.parentChain,
  }));
}
