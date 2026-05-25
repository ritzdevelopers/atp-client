import { generatePlaceholderStaticParams } from "@/lib/static-export";

export function generateStaticParams() {
  return generatePlaceholderStaticParams("user_id");
}

export default function ExitProcessReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
