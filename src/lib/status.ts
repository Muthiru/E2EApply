export function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function statusDotClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-status-pending";
    case "APPLIED":
      return "bg-status-applied";
    case "ASSESSMENT":
      return "bg-status-assessment";
    case "INTERVIEW":
      return "bg-status-interview";
    case "OFFER":
      return "bg-status-offer";
    case "REJECTED":
      return "bg-status-rejected";
    default:
      return "bg-status-pending";
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "border-status-pending/40 text-status-pending";
    case "APPLIED":
      return "border-status-applied/40 text-status-applied";
    case "ASSESSMENT":
      return "border-status-assessment/40 text-status-assessment";
    case "INTERVIEW":
      return "border-status-interview/40 text-status-interview";
    case "OFFER":
      return "border-status-offer/40 text-status-offer";
    case "REJECTED":
      return "border-status-rejected/40 text-status-rejected";
    default:
      return "border-muted text-muted-foreground";
  }
}

export function matchBadgeClass(score: number): string {
  if (score >= 70) return "border-status-offer/40 text-status-offer";
  if (score >= 50) return "border-status-assessment/40 text-status-assessment";
  return "border-status-rejected/40 text-status-rejected";
}