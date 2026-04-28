"use client";

import Button from "@/components/website/ui/Button";

type ModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  onClose: () => void;
};

export default function Modal({
  isOpen,
  title,
  message,
  buttonLabel,
  onClose,
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C123A]/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md">
        <h3 className="text-xl font-bold text-[#0C123A]">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <Button className="mt-6 w-full" onClick={onClose}>
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
