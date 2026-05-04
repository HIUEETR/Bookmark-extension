import type { BookmarkNode } from "../types";

const hasChromeBookmarks =
  typeof chrome !== "undefined" && !!chrome.bookmarks;

export async function getTree(): Promise<BookmarkNode[]> {
  if (!hasChromeBookmarks) {
    return getMockTree();
  }
  return await chrome.bookmarks.getTree();
}

export async function moveBookmark(
  id: string,
  parentId: string,
  index?: number
): Promise<void> {
  if (!hasChromeBookmarks) return;
  await chrome.bookmarks.move(id, { parentId, index });
}

export async function getChildren(id: string): Promise<BookmarkNode[]> {
  if (!hasChromeBookmarks) return [];
  return await chrome.bookmarks.getChildren(id);
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
          title: "Bookmarks Bar",
          children: [
            { id: "10", parentId: "1", title: "GitHub", url: "https://github.com/" },
            { id: "11", parentId: "1", title: "Google", url: "https://www.google.com/" },
            {
              id: "12",
              parentId: "1",
              title: "Work Folder",
              children: [
                { id: "13", parentId: "12", title: "Email", url: "https://mail.google.com/" },
              ],
            },
          ],
        },
        {
          id: "2",
          parentId: "0",
          title: "Other Bookmarks",
          children: [
            { id: "20", parentId: "2", title: "YouTube", url: "https://youtube.com/" },
            { id: "21", parentId: "2", title: "Twitter", url: "https://twitter.com/" },
          ],
        },
      ],
    },
  ];
}