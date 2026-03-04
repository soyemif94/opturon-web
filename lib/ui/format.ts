function asDate(input: Date | string | number) {
  return input instanceof Date ? input : new Date(input);
}

export function timeAgo(input: Date | string | number): string {
  const date = asDate(input);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `hace ${diffDays}d`;

  return formatDate(date);
}

export function formatDate(input: Date | string | number): string {
  const date = asDate(input);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatPhone(phone?: string): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return phone;
  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

