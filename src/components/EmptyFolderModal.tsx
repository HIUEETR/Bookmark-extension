import { useState } from "react";
import { useI18n } from "../context/I18nContext";

interface EmptyFolderModalProps {
  emptyFolders: { id: string; title: string; path: string }[];
  onDelete: (ids: string[]) => void;
  onClose: () => void;
}

export function EmptyFolderModal({ emptyFolders, onDelete, onClose }: EmptyFolderModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { t } = useI18n();

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleDelete = () => {
    onDelete(Array.from(selected));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="empty-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="empty-modal-title">{t.modal.emptyFolders.title}</h2>
        <p className="empty-modal-subtitle">{t.modal.emptyFolders.subtitle}</p>
        <div className="empty-modal-list">
          {emptyFolders.length === 0 ? (
            <div className="empty-modal-empty">{t.modal.emptyFolders.noFolders}</div>
          ) : (
            emptyFolders.map((folder) => (
              <label
                key={folder.id}
                className={`empty-modal-item${selected.has(folder.id) ? " selected-delete" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(folder.id)}
                  onChange={() => toggleSelect(folder.id)}
                  className="checkbox"
                />
                <span>{folder.title}</span>
                <span className="path">{folder.path}</span>
              </label>
            ))
          )}
        </div>
        <div className="empty-modal-actions">
          <button onClick={onClose} className="btn btn-ghost">
            {t.modal.emptyFolders.cancel}
          </button>
          <button
            onClick={handleDelete}
            disabled={selected.size === 0}
            className="btn btn-danger"
          >
            {t.modal.emptyFolders.delete.replace("{{count}}", String(selected.size))}
          </button>
        </div>
      </div>
    </div>
  );
}
