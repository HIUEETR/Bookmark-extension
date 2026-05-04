import { useState } from "react";
import { useI18n } from "../context/I18nContext";

interface PromptModalProps {
  title: string;
  defaultValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({ title, defaultValue, onSubmit, onCancel }: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const { t } = useI18n();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="prompt-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="prompt-modal-title">{title}</h3>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="prompt-modal-input"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit(value);
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="prompt-modal-actions">
          <button onClick={onCancel} className="btn btn-ghost">
            {t.modal.prompt.cancel}
          </button>
          <button onClick={() => onSubmit(value)} className="btn btn-primary">
            {t.modal.prompt.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
