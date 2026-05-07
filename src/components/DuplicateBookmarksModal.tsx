import type { DuplicateGroup } from "../types";
import { useI18n } from "../context/I18nContext";

interface DuplicateBookmarksModalProps {
  groups: DuplicateGroup[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function DuplicateBookmarksModal({ groups, selectedIds, onToggle, onDelete, onClose }: DuplicateBookmarksModalProps) {
  const { t } = useI18n();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="empty-modal wide-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="empty-modal-title">{t.duplicates.title}</h2>
        <p className="empty-modal-subtitle">{t.duplicates.subtitle}</p>
        <div className="duplicate-list">
          {groups.length === 0 ? <div className="empty-modal-empty">{t.duplicates.none}</div> : groups.map((group) => (
            <section key={group.url} className="duplicate-group">
              <strong>{group.url}</strong>
              {group.items.map((item, index) => (
                <label key={item.node.id} className="duplicate-item">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.node.id)}
                    onChange={() => onToggle(item.node.id)}
                    disabled={index === 0}
                  />
                  <span>{item.node.title || item.node.url}</span>
                  <small>{item.path}</small>
                </label>
              ))}
            </section>
          ))}
        </div>
        <div className="empty-modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t.modal.prompt.cancel}</button>
          <button className="btn btn-danger" onClick={onDelete} disabled={selectedIds.size === 0}>{t.common.deleteSelected}</button>
        </div>
      </div>
    </div>
  );
}
