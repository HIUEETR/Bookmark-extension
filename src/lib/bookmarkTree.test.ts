import { describe, expect, it } from "vitest";
import type { BookmarkNode } from "../types";
import {
  calculateStats,
  extractAllFolders,
  findDuplicateBookmarks,
  findEmptyFoldersInTree,
  normalizeUrl,
  searchBookmarks,
} from "./bookmarkTree";

const tree: BookmarkNode[] = [
  {
    id: "0",
    title: "",
    children: [
      {
        id: "1",
        title: "Bar",
        children: [
          { id: "2", parentId: "1", index: 0, title: "Example", url: "https://example.com/" },
          { id: "3", parentId: "1", index: 1, title: "Example duplicate", url: "https://EXAMPLE.com" },
          { id: "4", parentId: "1", index: 2, title: "Empty", children: [] },
          { id: "5", parentId: "1", index: 3, title: "Nested", children: [{ id: "6", parentId: "5", index: 0, title: "Child Empty", children: [] }] },
        ],
      },
    ],
  },
];

describe("bookmarkTree", () => {
  it("extracts folders with paths", () => {
    expect(extractAllFolders(tree).map((folder) => folder.path)).toEqual(["Bar", "Bar / Empty", "Bar / Nested", "Bar / Nested / Child Empty"]);
  });

  it("detects recursively empty folders", () => {
    expect(findEmptyFoldersInTree(tree).map((folder) => folder.title)).toEqual(["Empty", "Nested", "Child Empty"]);
  });

  it("normalizes and groups duplicate URLs", () => {
    expect(normalizeUrl("https://EXAMPLE.com/")).toBe("https://example.com");
    expect(findDuplicateBookmarks(tree)).toHaveLength(1);
  });

  it("calculates stats", () => {
    expect(calculateStats(tree)).toMatchObject({ bookmarks: 2, folders: 4, emptyFolders: 3, duplicateUrls: 1 });
  });

  it("searches by title and path", () => {
    expect(searchBookmarks(tree, "duplicate")[0].node.id).toBe("3");
  });
});
