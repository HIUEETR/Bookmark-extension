import { useLayoutEffect, useRef, useState } from "react";
import type { BookmarkStats } from "../types";
import { useI18n } from "../context/I18nContext";

interface StatsPanelProps {
  stats: BookmarkStats;
  onDuplicates: () => void;
  onEmptyFolders: () => void;
}

const MAX_DOMAINS = 4;

export function StatsPanel({ stats, onDuplicates, onEmptyFolders }: StatsPanelProps) {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(MAX_DOMAINS);

  const topDomains = stats.topDomains.slice(0, MAX_DOMAINS);

  // Measure how many domain pills fit; re-run on language change, stats change,
  // or container resize (window size, layout changes).
  useLayoutEffect(() => {
    const measure = () => {
      const listEl = listRef.current;
      const stripEl = measureRef.current;
      if (!listEl || !stripEl) return;
      stripEl.style.width = `${listEl.clientWidth}px`;
      const items = Array.from(stripEl.querySelectorAll<HTMLElement>(".domain-item"));
      let count = 0;
      for (const item of items) {
        if (item.offsetLeft + item.offsetWidth <= stripEl.clientWidth) count += 1;
        else break;
      }
      setVisibleCount((prev) => (prev === count ? prev : count));
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [t, stats.topDomains]);

  return (
    <>
      <div className="stats-panel">
        <div className="stat-card">
          <span>{t.stats.bookmarks}</span>
          <strong>{stats.bookmarks}</strong>
        </div>
        <div className="stat-card">
          <span>{t.stats.folders}</span>
          <strong>{stats.folders}</strong>
        </div>
        <button className="stat-card stat-action" onClick={onEmptyFolders} title={t.header.clearEmpty}>
          <span>{t.stats.emptyFolders}</span>
          <strong>{stats.emptyFolders}</strong>
        </button>
        <button className="stat-card stat-action" onClick={onDuplicates} title={t.header.duplicates}>
          <span>{t.stats.duplicates}</span>
          <strong>{stats.duplicateUrls}</strong>
        </button>
      </div>
      {topDomains.length > 0 && (
        <div className="domain-list" ref={listRef}>
          <span className="domain-title">{t.stats.topDomains}</span>
          {topDomains.slice(0, visibleCount).map((item) => (
            <span key={item.domain} className="domain-item">
              <span className="domain-name">{item.domain}</span>
              <span className="domain-count">{item.count}</span>
            </span>
          ))}
          <div className="domain-measure" ref={measureRef} aria-hidden="true">
            <span className="domain-title">{t.stats.topDomains}</span>
            {topDomains.map((item) => (
              <span key={item.domain} className="domain-item">
                <span className="domain-name">{item.domain}</span>
                <span className="domain-count">{item.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
