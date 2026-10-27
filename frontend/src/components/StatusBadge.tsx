import { statusLabel } from "@/lib/format";

const CLASSES: Record<string, string> = {
  ELIGIBLE: "badge-eligible",
  CONDITIONALLY_ELIGIBLE: "badge-conditional",
  NOT_ELIGIBLE: "badge-not",
  INSUFFICIENT_DATA: "badge-insufficient",
  REVIEW_REQUIRED: "badge-review",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${CLASSES[status] ?? "badge-neutral"}`}>
      {statusLabel(status)}
    </span>
  );
}
