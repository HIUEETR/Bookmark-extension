import { describe, expect, it } from "vitest";
import { parseBookmarkFile, validateImportedNodes } from "./importExport";

describe("importExport", () => {
  it("validates JSON nodes", () => {
    expect(validateImportedNodes([{ title: "A", url: "https://example.com" }])).toEqual([{ title: "A", url: "https://example.com", children: undefined }]);
  });

  it("parses JSON bookmark files", () => {
    expect(parseBookmarkFile('[{"title":"A","url":"https://example.com"}]', "bookmarks.json")).toHaveLength(1);
  });

  it("parses Netscape HTML bookmark folders and links", () => {
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1719985431" LAST_MODIFIED="1777905817">收藏夹栏</H3>
    <DL><p>
        <DT><A HREF="https://github.com/?q=a&amp;b=1" ADD_DATE="1719990937">GitHub &amp; Docs</A>
    </DL><p>
    <DT><H3>Tools</H3>
    <DL><p>
        <DT><A HREF="https://example.com">Example</A>
    </DL><p>
</DL><p>`;

    expect(parseBookmarkFile(html, "favorites.html")).toEqual([
      { title: "收藏夹栏", children: [{ title: "GitHub & Docs", url: "https://github.com/?q=a&b=1" }] },
      { title: "Tools", children: [{ title: "Example", url: "https://example.com" }] },
    ]);
  });
});
