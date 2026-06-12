import { generatePlaceholderStaticParams } from "@/lib/static-export";

export function generateStaticParams() {
  return generatePlaceholderStaticParams("task_id");
}

export default function ManageTaskDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
