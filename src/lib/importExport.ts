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

export async function importNodes(nodes: ImportedBookmarkNode[], parentId: string): Promise<void> {
  for (const node of nodes) {
    if (node.url) {
      await createBookmark({ parentId, title: node.title || node.url, url: node.url });
    } else if (node.children) {
      const folder = await createFolder({ parentId, title: node.title || "Imported" });
      await importNodes(node.children, folder.id);
    }
  }
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
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rootDl = doc.querySelector("dl");
  if (!rootDl) throw new Error("Invalid HTML bookmark file");
  return parseDl(rootDl);
}

function parseDl(dl: Element): ImportedBookmarkNode[] {
  const result: ImportedBookmarkNode[] = [];
  const children = Array.from(dl.children);
  for (let i = 0; i < children.length; i++) {
    const element = children[i];
    if (element.tagName.toLowerCase() !== "dt") continue;
    const link = element.querySelector(":scope > a");
    if (link) {
      const href = link.getAttribute("href");
      if (href) result.push({ title: link.textContent || href, url: href });
      continue;
    }
    const heading = element.querySelector(":scope > h3");
    const next = children[i + 1];
    if (heading && next?.tagName.toLowerCase() === "dl") {
      result.push({ title: heading.textContent || "Folder", children: parseDl(next) });
      i++;
    }
  }
  return result;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
