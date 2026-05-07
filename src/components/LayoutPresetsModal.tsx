import { useState } from "react";
import type { LayoutPreset } from "../types";
import { useI18n } from "../context/I18nContext";

interface LayoutPresetsModalProps {
  presets: LayoutPreset[];
  onSave: (name: string) => void;
  onApply: (preset: LayoutPreset) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function LayoutPresetsModal({ presets, onSave, onApply, onDelete, onClose }: LayoutPresetsModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="empty-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="empty-modal-title">{t.layouts.title}</h2>
        <div className="layout-save-row">
          <input className="prompt-modal-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.layouts.namePlaceholder} />
          <button className="btn btn-primary" onClick={() => { if (name.trim()) { onSave(name.trim()); setName(""); } }}>{t.layouts.save}</button>
        </div>
        <div className="picker-list">
          {presets.length === 0 ? <div className="empty-modal-empty">{t.layouts.empty}</div> : presets.map((preset) => (
            <div key={preset.id} className="layout-item">
              <button className="picker-item" onClick={() => onApply(preset)}>
                <strong>{preset.name}</strong>
                <span>{new Date(preset.createdAt).toLocaleString()} · {preset.columns.length} columns</span>
              </button>
              <button className="btn btn-ghost btn-icon" onClick={() => onDelete(preset.id)} aria-label={t.common.delete}>×</button>
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
