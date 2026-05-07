import { useState } from "react";
import type { ConfirmState } from "../types";
import { useI18n } from "../context/I18nContext";

interface ConfirmModalProps {
  state: ConfirmState;
  onClose: () => void;
}

export function ConfirmModal({ state, onClose }: ConfirmModalProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const canConfirm = !state.requireText || value === state.requireText;

  const confirm = async () => {
    if (!canConfirm || pending) return;
    setPending(true);
    await state.onConfirm();
    setPending(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="prompt-modal confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 className="prompt-modal-title">{state.title}</h3>
        <p className="modal-text">{state.message}</p>
        {state.requireText && (
          <label className="field-label">
            {t.modal.confirm.typeToConfirm.replace("{{value}}", state.requireText)}
            <input
              className="prompt-modal-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </label>
        )}
        <div className="prompt-modal-actions">
          <button onClick={onClose} className="btn btn-ghost" disabled={pending}>
            {t.modal.prompt.cancel}
          </button>
          <button
            onClick={confirm}
            disabled={!canConfirm || pending}
            className={`btn ${state.danger ? "btn-danger" : "btn-primary"}`}
          >
            {pending ? t.common.working : state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
