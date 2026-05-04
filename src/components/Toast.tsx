import { useEffect } from "react";
import { IconX } from "./Icons";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast">
      <span>{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        <IconX />
      </button>
    </div>
  );
}
