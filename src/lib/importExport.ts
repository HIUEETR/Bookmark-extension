import type { BookmarkNode, ImportedBookmarkNode } from "../types";
import { createBookmark, createFolder } from "./bookmarks";

export function validateImportedNodes(input: unknown): ImportedBookmarkNode[] {
  const roots = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input.children)
      ? input.children
      : isRecord(input) && Array.isArray(input.roots)
        ? input.roots
        : null;
  if (!roots) throw new Error("Invalid bookmark file");
  return roots.map(normalizeImportedNode).filter(Boolean) as ImportedBookmarkNode[];
}

export async function importNodes(nodes: ImportedBookmarkNode[], parentId: string): Promise<BookmarkNode[]> {
  const created: BookmarkNode[] = [];
  for (const node of nodes) {
    if (node.url) {
      created.push(await createBookmark({ parentId, title: node.title || node.url, url: node.url }));
    } else if (node.children) {
      const folder = await createFolder({ parentId, title: node.title || "Imported" });
      await importNodes(node.children, folder.id);
      created.push(folder);
    }
  }
  return created;
}

export function exportJson(tree: BookmarkNode[]): Blob {
  return new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" });
}

export function exportHtml(tree: BookmarkNode[]): Blob {
  const body = tree.flatMap((node) => renderHtmlNode(node, 0)).join("\n");
  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${body}\n</DL><p>\n`;
  return new Blob([html], { type: "text/html" });
}

export function parseBookmarkFile(text: string, fileName: string): ImportedBookmarkNode[] {
  const trimmed = text.trim();
  if (fileName.toLowerCase().endsWith(".html") || /^<!DOCTYPE NETSCAPE-Bookmark-file-1/i.test(trimmed) || trimmed.includes("<DT><A")) {
    return parseNetscapeHtml(text);
  }
  return validateImportedNodes(JSON.parse(text));
}

function normalizeImportedNode(node: unknown): ImportedBookmarkNode | null {
  if (!isRecord(node)) return null;
  const title = typeof node.title === "string" ? node.title : "";
  const url = typeof node.url === "string" ? node.url : undefined;
  const children = Array.isArray(node.children)
    ? node.children.map(normalizeImportedNode).filter(Boolean) as ImportedBookmarkNode[]
    : undefined;
  if (!url && !children) return null;
  return { title, url, children };
}

function renderHtmlNode(node: BookmarkNode, depth: number): string[] {
  if (node.id === "0") return (node.children || []).flatMap((child) => renderHtmlNode(child, depth));
  const indent = "    ".repeat(depth + 1);
  if (node.url) {
    const date = node.dateAdded ? Math.floor(node.dateAdded / 1000) : "";
    return [`${indent}<DT><A HREF="${escapeHtml(node.url)}"${date ? ` ADD_DATE="${date}"` : ""}>${escapeHtml(node.title || node.url)}</A>`];
  }
  const lines = [`${indent}<DT><H3>${escapeHtml(node.title || "Folder")}</H3>`, `${indent}<DL><p>`];
  for (const child of node.children || []) lines.push(...renderHtmlNode(child, depth + 1));
  lines.push(`${indent}</DL><p>`);
  return lines;
}

function parseNetscapeHtml(html: string): ImportedBookmarkNode[] {
  const roots: ImportedBookmarkNode[] = [];
  const stack: ImportedBookmarkNode[][] = [roots];
  let pendingFolder: ImportedBookmarkNode | null = null;
  let hasRootList = false;
  const tokenPattern = /<DT>\s*<H3\b[^>]*>([\s\S]*?)<\/H3>|<DT>\s*<A\b([^>]*)>([\s\S]*?)<\/A>|<DL\b[^>]*>|<\/DL\s*>/gi;

  for (const match of html.matchAll(tokenPattern)) {
    const token = match[0];
    const tag = token.match(/^<\/?\w+/)?.[0].toLowerCase();

    if (match[1] !== undefined) {
      const folder: ImportedBookmarkNode = { title: decodeHtml(stripHtml(match[1])) || "Folder", children: [] };
      stack[stack.length - 1].push(folder);
      pendingFolder = folder;
      continue;
    }

    if (match[2] !== undefined) {
      const href = getAttribute(match[2], "href");
      if (href) stack[stack.length - 1].push({ title: decodeHtml(stripHtml(match[3])) || href, url: decodeHtml(href) });
      pendingFolder = null;
      continue;
    }

    if (tag === "<dl") {
      if (!hasRootList) {
        hasRootList = true;
      } else if (pendingFolder?.children) {
        stack.push(pendingFolder.children);
      }
      pendingFolder = null;
      continue;
    }

    if (tag === "</dl" && stack.length > 1) stack.pop();
  }

  if (!hasRootList && roots.length === 0) throw new Error("Invalid HTML bookmark file");
  return roots;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

function getAttribute(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function decodeHtml(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (_, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" }[lower] || `&${entity};`;
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
