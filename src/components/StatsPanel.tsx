import type { BookmarkStats } from "../types";
import { useI18n } from "../context/I18nContext";

interface StatsPanelProps {
  stats: BookmarkStats;
  onDuplicates: () => void;
  onEmptyFolders: () => void;
}

export function StatsPanel({ stats, onDuplicates, onEmptyFolders }: StatsPanelProps) {
  const { t } = useI18n();
  return (
    <div className="stats-panel">
      <div className="stat-card">
        <span>{t.stats.bookmarks}</span>
        <strong>{stats.bookmarks}</strong>
      </div>
      <div className="stat-card">
        <span>{t.stats.folders}</span>
        <strong>{stats.folders}</strong>
      </div>
      <button className="stat-card stat-action" onClick={onEmptyFolders}>
        <span>{t.stats.emptyFolders}</span>
        <strong>{stats.emptyFolders}</strong>
      </button>
      <button className="stat-card stat-action" onClick={onDuplicates}>
        <span>{t.stats.duplicates}</span>
        <strong>{stats.duplicateUrls}</strong>
      </button>
      <div className="domain-list">
        {stats.topDomains.map((item) => (
          <span key={item.domain}>{item.domain} · {item.count}</span>
        ))}
      </div>
    </div>
  );
}
