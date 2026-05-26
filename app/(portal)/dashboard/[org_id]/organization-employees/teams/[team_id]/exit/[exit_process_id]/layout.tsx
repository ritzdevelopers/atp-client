import { generatePlaceholderStaticParams } from "@/lib/static-export";

export function generateStaticParams() {
  return generatePlaceholderStaticParams("exit_process_id");
}

export default function ExitProcessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
