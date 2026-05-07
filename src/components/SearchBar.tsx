import type { BookmarkDetail } from "../types";
import { useI18n } from "../context/I18nContext";

interface SearchBarProps {
  value: string;
  results: BookmarkDetail[];
  onChange: (value: string) => void;
  onPick: (detail: BookmarkDetail) => void;
}

export function SearchBar({ value, results, onChange, onPick }: SearchBarProps) {
  const { t } = useI18n();

  return (
    <div className="search-box">
      <input
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.search.placeholder}
      />
      {value.trim() && (
        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-empty">{t.search.noResults}</div>
          ) : (
            results.map((result) => (
              <button key={result.node.id} className="search-result" onClick={() => onPick(result)}>
                <strong>{result.node.title || result.node.url}</strong>
                <span>{result.path}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
