import { useRef, useState } from "react";
import { getImportedBookmarksFolderId, loadExampleBookmarks } from "../lib/bookmarks";
import { importNodes, parseBookmarkFile } from "../lib/importExport";
import { IconDownload, IconUpload } from "./Icons";

type WelcomeScreenProps = {
  onReady: (folderIds?: string[]) => Promise<void> | void;
};

export function WelcomeScreen({ onReady }: WelcomeScreenProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(file: File) {
    setLoading(true);
    setError(null);
    try {
      const nodes = parseBookmarkFile(await file.text(), file.name);
      const parentId = await getImportedBookmarksFolderId();
      const importedNodes = await importNodes(nodes, parentId);
      const importedFolderIds = importedNodes.filter((node) => node.children && node.children.length > 0).map((node) => node.id);
      await onReady([parentId, ...importedFolderIds]);
    } catch {
      setError("导入失败，请确认文件是浏览器导出的 HTML 书签文件或本项目导出的 JSON 文件。");
    } finally {
      setLoading(false);
    }
  }

  async function handleExample() {
    setLoading(true);
    setError(null);
    try {
      await loadExampleBookmarks();
      await onReady();
    } catch {
      setError("加载示例数据失败，请刷新页面后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="welcome-page">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-kicker">Bookmark Web</div>
        <h1 id="welcome-title" className="welcome-title">离线书签管理器</h1>
        <p className="welcome-description">
          数据只保存在当前浏览器本地，不会上传到服务器。先导入浏览器书签文件，之后就可以在网页里整理、搜索、导出和备份。
        </p>

        <div className="welcome-actions">
          <button className="btn btn-primary welcome-primary" onClick={() => inputRef.current?.click()} disabled={loading}>
            <IconUpload />导入书签文件
          </button>
          <button className="btn btn-ghost" onClick={() => void handleExample()} disabled={loading}>
            <IconDownload />使用示例数据
          </button>
        </div>

        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".json,.html,.htm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImport(file);
            event.target.value = "";
          }}
        />

        {loading && <p className="welcome-status">正在处理书签数据...</p>}
        {error && <p className="welcome-error" role="alert">{error}</p>}

        <div className="welcome-notes">
          <div>
            <strong>支持格式</strong>
            <span>Chrome / Edge / Firefox 导出的 HTML，或本项目导出的 JSON。</span>
          </div>
          <div>
            <strong>本地存储</strong>
            <span>刷新页面后数据仍保留；清理浏览器站点数据会删除本地书签。</span>
          </div>
          <div>
            <strong>免费部署</strong>
            <span>这是纯静态网页，可以部署到 GitHub Pages。</span>
          </div>
        </div>
      </section>
    </div>
  );
}
