import { generatePlaceholderStaticParams } from "@/lib/static-export";

export function generateStaticParams() {
  return generatePlaceholderStaticParams("task_id");
}

export default function MyTaskDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
