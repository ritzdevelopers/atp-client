import type {
  RegularizationHrReviewRow,
  RegularizationManagerRow,
} from "@/services/regularization";

export type RegularizationQueueKind = "manager" | "hr";

export type RegularizationTabItem = {
  queue: RegularizationQueueKind;
  row: RegularizationManagerRow | RegularizationHrReviewRow;
};

export function isHrOrAdminRole(roleName: string | null | undefined): boolean {
  const role = String(roleName ?? "")
    .trim()
    .toLowerCase();
  return role === "hr" || role === "admin";
}

export function mergeRegularizationQueues(
  managerRows: RegularizationManagerRow[],
  hrRows: RegularizationHrReviewRow[],
): RegularizationTabItem[] {
  const byId = new Map<number, RegularizationTabItem>();

  for (const row of managerRows) {
    byId.set(row.id, { queue: "manager", row });
  }

  for (const row of hrRows) {
    byId.set(row.id, { queue: "hr", row });
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aTime = new Date(String(a.row.created_at ?? 0)).getTime();
    const bTime = new Date(String(b.row.created_at ?? 0)).getTime();
    return bTime - aTime;
  });
}

export function isRegularizationTabItemActionable(item: RegularizationTabItem): boolean {
  const status = String(item.row.reg_status).toLowerCase();
  if (item.queue === "hr") {
    const hrRow = item.row as RegularizationHrReviewRow;
    return (
      status === "hr_pending" &&
      String(hrRow.hr_action ?? "pending").toLowerCase() === "pending"
    );
  }
  return status === "pending";
}

export function countPendingRegularizationItems(items: RegularizationTabItem[]): number {
  return items.filter(isRegularizationTabItemActionable).length;
}

export function regularizationDisplayStatus(item: RegularizationTabItem): string {
  if (item.queue === "hr") {
    const hrRow = item.row as RegularizationHrReviewRow;
    if (
      String(item.row.reg_status).toLowerCase() === "hr_pending" &&
      String(hrRow.hr_action ?? "pending").toLowerCase() === "pending"
    ) {
      return "hr_pending";
    }
  }
  return String(item.row.reg_status);
}
