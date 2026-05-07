import type { BookmarkDetail } from "../types";
import { useI18n } from "../context/I18nContext";

interface BookmarkDetailsPanelProps {
  detail: BookmarkDetail | null;
  onClose: () => void;
  onEdit: () => void;
}

export function BookmarkDetailsPanel({ detail, onClose, onEdit }: BookmarkDetailsPanelProps) {
  const { t } = useI18n();
  if (!detail) return null;
  const { node, path } = detail;

  return (
    <aside className="details-panel">
      <div className="details-header">
        <h2>{t.details.title}</h2>
        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t.common.close}>×</button>
      </div>
      <div className="details-body">
        <div className="detail-row">
          <span>{t.details.name}</span>
          <strong>{node.title || node.url}</strong>
        </div>
        <div className="detail-row">
          <span>{t.details.url}</span>
          <a href={node.url} target="_blank" rel="noopener noreferrer">{node.url}</a>
        </div>
        <div className="detail-row">
          <span>{t.details.path}</span>
          <strong>{path}</strong>
        </div>
        {node.dateAdded && (
          <div className="detail-row">
            <span>{t.details.dateAdded}</span>
            <strong>{new Date(node.dateAdded).toLocaleString()}</strong>
          </div>
        )}
      </div>
      <div className="details-actions">
        <button className="btn btn-primary" onClick={onEdit}>{t.details.edit}</button>
        <button className="btn btn-ghost" onClick={() => node.url && navigator.clipboard?.writeText(node.url)}>{t.details.copyUrl}</button>
      </div>
    </aside>
  );
}
