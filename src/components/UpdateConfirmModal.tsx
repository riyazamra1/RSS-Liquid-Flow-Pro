import React from 'react';
import { Download, Sparkles, X } from 'lucide-react';

interface UpdateConfirmModalProps {
  open: boolean;
  version: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export const UpdateConfirmModal: React.FC<UpdateConfirmModalProps> = ({
  open,
  version,
  onConfirm,
  onDismiss,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl theme-surface border p-6 shadow-2xl relative overflow-hidden">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss update"
          className="absolute top-4 right-4 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl theme-surface-muted theme-ink cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E55A3C] to-[#E8A317] text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#E55A3C] dark:text-[#2BD4C5]">Update Available</div>
            <h2 id="update-modal-title" className="font-display text-xl font-bold theme-ink">
              Version {version} Ready
            </h2>
          </div>
        </div>

        <p className="text-sm theme-ink-secondary mb-6">
          A new version of RSS Liquid Flow is available with performance improvements and new level layouts. Auto-update is currently turned off in Settings. Would you like to install now?
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 min-h-[46px] rounded-2xl theme-surface-muted border font-display text-sm font-bold theme-ink cursor-pointer hover:opacity-90"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 min-h-[46px] rounded-2xl btn-tactile-coral text-white font-display text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Install &amp; Restart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
