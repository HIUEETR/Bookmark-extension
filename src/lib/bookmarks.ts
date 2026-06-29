import type { BookmarkNode } from "../types";

const hasChromeBookmarks =
  typeof chrome !== "undefined" && !!chrome.bookmarks;

const mockTree = getMockTree();
let mockNextId = 1000;

export async function getTree(): Promise<BookmarkNode[]> {
  if (!hasChromeBookmarks) return cloneTree(mockTree);
  return await chrome.bookmarks.getTree();
}

export async function getBookmark(id: string): Promise<BookmarkNode | null> {
  if (!hasChromeBookmarks) return findMockNode(id)?.node || null;
  const nodes = await chrome.bookmarks.get(id);
  return nodes[0] || null;
}

export async function getChildren(id: string): Promise<BookmarkNode[]> {
  if (!hasChromeBookmarks) return findMockNode(id)?.node.children || [];
  return await chrome.bookmarks.getChildren(id);
}

export async function createBookmark(input: {
  parentId: string;
  title: string;
  url: string;
  index?: number;
}): Promise<BookmarkNode> {
  if (!hasChromeBookmarks) return createMockNode(input);
  return await chrome.bookmarks.create(input);
}

export async function createFolder(input: {
  parentId: string;
  title: string;
  index?: number;
}): Promise<BookmarkNode> {
  if (!hasChromeBookmarks) return createMockNode(input);
  return await chrome.bookmarks.create(input);
}

export async function updateBookmark(
  id: string,
  changes: { title?: string; url?: string }
): Promise<BookmarkNode> {
  if (!hasChromeBookmarks) {
    const found = findMockNode(id);
    if (!found) throw new Error("Bookmark not found");
    found.node.title = changes.title ?? found.node.title;
    if ("url" in changes) found.node.url = changes.url;
    return { ...found.node };
  }
  return await chrome.bookmarks.update(id, changes);
}

export async function removeBookmark(id: string): Promise<void> {
  if (!hasChromeBookmarks) {
    removeMockNode(id);
    return;
  }
  await chrome.bookmarks.remove(id);
}

export async function removeTree(id: string): Promise<void> {
  if (!hasChromeBookmarks) {
    removeMockNode(id);
    return;
  }
  await chrome.bookmarks.removeTree(id);
}

export async function moveBookmark(
  id: string,
  parentId: string,
  index?: number
): Promise<BookmarkNode | void> {
  if (!hasChromeBookmarks) return moveMockNode(id, parentId, index);
  return await chrome.bookmarks.move(id, { parentId, index });
}

export async function getImportedBookmarksFolderId(): Promise<string> {
  const tree = await getTree();
  const root = tree[0];
  const parent = root.children?.find((node) => !node.url) || root;
  const existing = parent.children?.find((node) => !node.url && node.title === "Imported Bookmarks");
  if (existing) return existing.id;
  return (await createFolder({ parentId: parent.id, title: "Imported Bookmarks" })).id;
}

export async function isBookmarksEmpty(): Promise<boolean> {
  const tree = await getTree();
  const root = tree[0];
  return !root.children?.some((folder) => (folder.children?.length || 0) > 0);
}

export async function loadExampleBookmarks(): Promise<void> {
  if (!hasChromeBookmarks) {
    mockTree.splice(0, mockTree.length);
    mockTree.push(...getMockTree());
    mockNextId = 1000;
    return;
  }
  await chrome.bookmarks.create({ parentId: "1", title: "GitHub", url: "https://github.com/" });
  await chrome.bookmarks.create({ parentId: "1", title: "Google", url: "https://www.google.com/" });
  await chrome.bookmarks.create({ parentId: "1", title: "GitHub Mirror", url: "https://github.com" });
  const workFolder = await chrome.bookmarks.create({ parentId: "1", title: "Work Folder" });
  if (workFolder.id) {
    await chrome.bookmarks.create({ parentId: workFolder.id, title: "Email", url: "https://mail.google.com/" });
  }
  await chrome.bookmarks.create({ parentId: "1", title: "Empty Folder" });
  await chrome.bookmarks.create({ parentId: "2", title: "YouTube", url: "https://youtube.com/" });
  await chrome.bookmarks.create({ parentId: "2", title: "MDN", url: "https://developer.mozilla.org/" });
}

function createMockNode(input: {
  parentId: string;
  title: string;
  url?: string;
  index?: number;
}): BookmarkNode {
  const parent = findMockNode(input.parentId)?.node;
  if (!parent) throw new Error("Parent folder not found");
  if (!parent.children) parent.children = [];
  const node: BookmarkNode = {
    id: String(mockNextId++),
    parentId: input.parentId,
    index: input.index ?? parent.children.length,
    title: input.title,
    url: input.url,
    dateAdded: Date.now(),
    children: input.url ? undefined : [],
  };
  parent.children.splice(input.index ?? parent.children.length, 0, node);
  reindex(parent.children);
  return { ...node };
}

function moveMockNode(id: string, parentId: string, index?: number): BookmarkNode | void {
  const found = findMockNode(id);
  const targetParent = findMockNode(parentId)?.node;
  if (!found || !targetParent) return;
  if (!targetParent.children) targetParent.children = [];
  found.siblings.splice(found.index, 1);
  reindex(found.siblings);
  const targetIndex = Math.max(0, Math.min(index ?? targetParent.children.length, targetParent.children.length));
  found.node.parentId = parentId;
  targetParent.children.splice(targetIndex, 0, found.node);
  reindex(targetParent.children);
  return { ...found.node };
}

function removeMockNode(id: string) {
  const found = findMockNode(id);
  if (!found) throw new Error("Bookmark not found");
  found.siblings.splice(found.index, 1);
  reindex(found.siblings);
}

function findMockNode(
  id: string,
  nodes = mockTree,
  siblings: BookmarkNode[] = mockTree
): { node: BookmarkNode; siblings: BookmarkNode[]; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === id) return { node, siblings, index: i };
    if (node.children) {
      const found = findMockNode(id, node.children, node.children);
      if (found) return found;
    }
  }
  return null;
}

function reindex(nodes: BookmarkNode[]) {
  nodes.forEach((node, index) => {
    node.index = index;
  });
}

function cloneTree(tree: BookmarkNode[]): BookmarkNode[] {
  return JSON.parse(JSON.stringify(tree));
}

function getMockTree(): BookmarkNode[] {
  return [
    {
      id: "0",
      title: "",
      children: [
        {
          id: "1",
          parentId: "0",
          index: 0,
          title: "Bookmarks Bar",
          children: [
            { id: "10", parentId: "1", index: 0, title: "GitHub", url: "https://github.com/", dateAdded: Date.now() - 500000 },
            { id: "11", parentId: "1", index: 1, title: "Google", url: "https://www.google.com/", dateAdded: Date.now() - 400000 },
            { id: "14", parentId: "1", index: 2, title: "GitHub Mirror", url: "https://github.com", dateAdded: Date.now() - 300000 },
            {
              id: "12",
              parentId: "1",
              index: 3,
              title: "Work Folder",
              children: [
                { id: "13", parentId: "12", index: 0, title: "Email", url: "https://mail.google.com/", dateAdded: Date.now() - 200000 },
              ],
            },
            { id: "15", parentId: "1", index: 4, title: "Empty Folder", children: [] },
          ],
        },
        {
          id: "2",
          parentId: "0",
          index: 1,
          title: "Other Bookmarks",
          children: [
            { id: "20", parentId: "2", index: 0, title: "YouTube", url: "https://youtube.com/", dateAdded: Date.now() - 100000 },
            { id: "21", parentId: "2", index: 1, title: "MDN", url: "https://developer.mozilla.org/", dateAdded: Date.now() - 90000 },
          ],
        },
      ],
    },
  ];
}
