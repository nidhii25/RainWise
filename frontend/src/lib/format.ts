export function litres(value: number, digits = 0): string {
  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)} L`;
}

export function number(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function dateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function systemLabel(system: string): string {
  switch (system) {
    case "storage_only":
      return "Storage only";
    case "storage_and_recharge":
      return "Storage + recharge";
    case "recharge_only":
      return "Recharge only";
    case "none":
      return "No system sized";
    default:
      return system;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "ELIGIBLE":
      return "Eligible";
    case "CONDITIONALLY_ELIGIBLE":
      return "Conditionally eligible";
    case "NOT_ELIGIBLE":
      return "Not eligible";
    case "INSUFFICIENT_DATA":
      return "More data needed";
    case "REVIEW_REQUIRED":
      return "Review required";
    default:
      return status;
  }
}

export function dimensionText(dimensions: Record<string, number>): string {
  if ("diameter_m" in dimensions && "height_m" in dimensions) {
    return `Ø ${number(dimensions.diameter_m, 2)} m × H ${number(dimensions.height_m, 2)} m`;
  }
  if ("diameter_m" in dimensions && "depth_m" in dimensions) {
    return `Ø ${number(dimensions.diameter_m, 2)} m × D ${number(dimensions.depth_m, 2)} m`;
  }
  if ("length_m" in dimensions && "width_m" in dimensions) {
    const depth = dimensions.depth_m ?? dimensions.height_m;
    return `${number(dimensions.length_m, 2)} × ${number(dimensions.width_m, 2)}${
      depth ? ` × ${number(depth, 2)}` : ""
    } m`;
  }
  return Object.entries(dimensions)
    .map(([key, value]) => `${key.replace(/_m$/, "")} ${number(value, 2)}`)
    .join(" · ");
}

export function initials(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
