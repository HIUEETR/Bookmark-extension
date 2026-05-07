import type { BrokenBookmarkResult } from "../types";
import { useI18n } from "../context/I18nContext";

interface BrokenBookmarksModalProps {
  results: BrokenBookmarkResult[];
  loading: boolean;
  onCheck: () => void;
  onClose: () => void;
}

export function BrokenBookmarksModal({ results, loading, onCheck, onClose }: BrokenBookmarksModalProps) {
  const { t } = useI18n();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="empty-modal wide-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="empty-modal-title">{t.broken.title}</h2>
        <p className="empty-modal-subtitle">{t.broken.subtitle}</p>
        <div className="empty-modal-actions top-actions">
          <button className="btn btn-primary" onClick={onCheck} disabled={loading}>{loading ? t.common.working : t.broken.check}</button>
        </div>
        <div className="duplicate-list">
          {results.length === 0 ? <div className="empty-modal-empty">{t.broken.empty}</div> : results.map((result) => (
            <div key={result.id} className={`broken-item status-${result.status}`}>
              <strong>{result.title || result.url}</strong>
              <a href={result.url} target="_blank" rel="noopener noreferrer">{result.url}</a>
              <small>{result.path}</small>
              <span>{t.broken[result.status]} · {result.reason}</span>
            </div>
          ))}
        </div>
        <div className="empty-modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t.common.close}</button>
        </div>
      </div>
    </div>
  );
}
