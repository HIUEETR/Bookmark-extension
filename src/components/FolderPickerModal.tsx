import { useState } from "react";
import type { FolderOption } from "../types";
import { useI18n } from "../context/I18nContext";

interface FolderPickerModalProps {
  folders: FolderOption[];
  title: string;
  onPick: (folderId: string) => void;
  onClose: () => void;
}

export function FolderPickerModal({ folders, title, onPick, onClose }: FolderPickerModalProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const filtered = folders.filter((folder) => `${folder.title} ${folder.path}`.toLowerCase().includes(query.toLowerCase())).slice(0, 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="empty-modal picker-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="empty-modal-title">{title}</h2>
        <input
          className="prompt-modal-input"
          placeholder={t.modal.folderPicker.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="picker-list">
          {filtered.map((folder) => (
            <button key={folder.id} className="picker-item" onClick={() => onPick(folder.id)}>
              <strong>{folder.title}</strong>
              <span>{folder.path}</span>
            </button>
          ))}
        </div>
        <div className="empty-modal-actions">
          <button onClick={onClose} className="btn btn-ghost">{t.modal.prompt.cancel}</button>
        </div>
      </div>
    </div>
  );
}
