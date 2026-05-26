import { generatePlaceholderStaticParams } from "@/lib/static-export";

export function generateStaticParams() {
  return generatePlaceholderStaticParams("team_id");
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
