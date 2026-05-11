import type { BrokenBookmarkResult, BookmarkDetail, BookmarkNode, TrashEntry } from "../types";
import { flattenBookmarks } from "./bookmarkTree";
import { readStorage, writeStorage } from "./storage";

const TRASH_KEY = "my-bookmark-trash";
const TRASH_LIMIT = 100;

export async function addTrashEntries(nodes: BookmarkNode[]): Promise<void> {
  const existing = await readStorage<TrashEntry[]>(TRASH_KEY, []);
  const entries = nodes.map((node) => ({
    id: `${node.id}-${Date.now()}`,
    deletedAt: Date.now(),
    title: node.title || node.url || "Untitled",
    parentId: node.parentId,
    node,
  }));
  await writeStorage(TRASH_KEY, [...entries, ...existing].slice(0, TRASH_LIMIT));
}

export async function getTrashEntries(): Promise<TrashEntry[]> {
  return readStorage<TrashEntry[]>(TRASH_KEY, []);
}

export async function checkBrokenBookmarks(
  tree: BookmarkNode[],
  ids?: Set<string>
): Promise<BrokenBookmarkResult[]> {
  const targets = flattenBookmarks(tree).filter(({ node }) => node.url && (!ids || ids.has(node.id))).slice(0, 50);
  const results: BrokenBookmarkResult[] = [];
  for (const detail of targets) {
    results.push(await checkOne(detail));
  }
  return results;
}

async function checkOne(detail: BookmarkDetail): Promise<BrokenBookmarkResult> {
  const url = detail.node.url || "";
  try {
    const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
    if (response.type === "opaque") return baseResult(detail, "ok", "Reachable");
    if (response.ok) return baseResult(detail, "ok", String(response.status));
    return baseResult(detail, response.status >= 400 ? "broken" : "unknown", String(response.status));
  } catch (error) {
    return baseResult(detail, "unknown", error instanceof Error ? error.message : "Request failed");
  }
}

function baseResult(
  detail: BookmarkDetail,
  status: BrokenBookmarkResult["status"],
  reason: string
): BrokenBookmarkResult {
  return {
    id: detail.node.id,
    title: detail.node.title,
    url: detail.node.url || "",
    path: detail.path,
    status,
    reason,
  };
}
