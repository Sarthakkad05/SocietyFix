import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "CONFIRM ENTRY",
  cancelText = "CANCEL",
}: ConfirmDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className="ledger-board bg-[var(--surface)] border border-[var(--border)] w-full max-w-md p-6 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div>
          <h3 className="font-display font-bold text-lg text-[var(--ink)] uppercase tracking-wide">
            {title}
          </h3>
          <p className="font-body text-xs text-[var(--ink-muted)] mt-2 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <button
            onClick={onCancel}
            className="btn-minimal-secondary text-xs py-2 px-4"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="btn-minimal btn-minimal-accent text-xs py-2 px-4"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
