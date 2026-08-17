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
    case "APPLIED":
      return "bg-status-applied/10 text-status-applied";
    case "ASSESSMENT":
      return "bg-status-assessment/10 text-status-assessment";
    case "INTERVIEW":
      return "bg-status-interview/10 text-status-interview";
    case "OFFER":
      return "bg-status-offer/10 text-status-offer";
    case "REJECTED":
      return "bg-status-rejected/10 text-status-rejected";
    default:
      return "bg-muted text-muted-foreground";
  }
}