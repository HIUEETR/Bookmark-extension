import { useState } from "react";
import { useI18n } from "../context/I18nContext";

interface BookmarkEditModalProps {
  title: string;
  url: string;
  onSubmit: (value: { title: string; url: string }) => void;
  onCancel: () => void;
}

export function BookmarkEditModal({ title, url, onSubmit, onCancel }: BookmarkEditModalProps) {
  const { t } = useI18n();
  const [nextTitle, setNextTitle] = useState(title);
  const [nextUrl, setNextUrl] = useState(url);
  const [error, setError] = useState("");

  const submit = () => {
    const trimmedUrl = nextUrl.trim();
    try {
      new URL(trimmedUrl);
    } catch {
      setError(t.modal.bookmarkEdit.invalidUrl);
      return;
    }
    onSubmit({ title: nextTitle.trim() || trimmedUrl, url: trimmedUrl });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="prompt-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 className="prompt-modal-title">{t.modal.bookmarkEdit.title}</h3>
        <label className="field-label">
          {t.modal.bookmarkEdit.name}
          <input className="prompt-modal-input" value={nextTitle} onChange={(e) => setNextTitle(e.target.value)} autoFocus />
        </label>
        <label className="field-label">
          {t.modal.bookmarkEdit.url}
          <input
            className="prompt-modal-input"
            value={nextUrl}
            onChange={(e) => {
              setNextUrl(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onCancel();
            }}
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="prompt-modal-actions">
          <button onClick={onCancel} className="btn btn-ghost">{t.modal.prompt.cancel}</button>
          <button onClick={submit} className="btn btn-primary">{t.modal.prompt.ok}</button>
        </div>
      </div>
    </div>
  );
}
