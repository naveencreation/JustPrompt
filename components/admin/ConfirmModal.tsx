import { LoaderIcon, CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div 
        className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
          <h2 className="font-medium text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-neutral-600">{description}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 px-4 py-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md px-4 py-2 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-[background-color,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              isDestructive
                ? "bg-[#FDEBEC] text-[#9F2F2D] hover:bg-[#F8D0D1]"
                : "bg-neutral-900 text-neutral-50 hover:bg-neutral-700"
            )}
          >
            {isLoading && <LoaderIcon size={14} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
