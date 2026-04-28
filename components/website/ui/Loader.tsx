"use client";

type LoaderProps = {
  text?: string;
};

export default function Loader({ text = "Loading..." }: LoaderProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white" />
      <span>{text}</span>
    </span>
  );
}
