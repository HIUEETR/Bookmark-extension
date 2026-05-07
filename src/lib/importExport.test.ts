import { describe, expect, it } from "vitest";
import { parseBookmarkFile, validateImportedNodes } from "./importExport";

describe("importExport", () => {
  it("validates JSON nodes", () => {
    expect(validateImportedNodes([{ title: "A", url: "https://example.com" }])).toEqual([{ title: "A", url: "https://example.com", children: undefined }]);
  });

  it("parses JSON bookmark files", () => {
    expect(parseBookmarkFile('[{"title":"A","url":"https://example.com"}]', "bookmarks.json")).toHaveLength(1);
  });
});
