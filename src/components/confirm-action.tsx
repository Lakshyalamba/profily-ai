"use client";
import { useId, useRef } from "react";
import { TriangleAlert, X } from "lucide-react";
import { Button } from "./ui/button";
type Props = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
};
export function ConfirmAction({
  title,
  description,
  onConfirm,
  confirmLabel = "Delete permanently",
  children,
  ...props
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  return (
    <>
      <Button
        type="button"
        {...props}
        onClick={() => {
          dialog.current?.showModal();
          cancel.current?.focus();
        }}
      >
        {children}
      </Button>
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div>
          <button
            className="dialog-close"
            aria-label="Close confirmation"
            onClick={() => dialog.current?.close()}
          >
            <X size={17} />
          </button>
          <span className="dialog-symbol">
            <TriangleAlert size={25} />
          </span>
          <h2 id={`${id}-title`}>{title}</h2>
          <p id={`${id}-description`}>{description}</p>
          <div className="actions">
            <Button
              type="button"
              variant="outline"
              ref={cancel}
              onClick={() => dialog.current?.close()}
            >
              Keep it
            </Button>
            <Button
              type="button"
              className="button-danger"
              onClick={() => {
                dialog.current?.close();
                void onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
