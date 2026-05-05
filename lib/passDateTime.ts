export const PASS_TIME_ZONE = "Asia/Kolkata";

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const PASS_TIME_PATTERN = /^\d{2}:\d{2}$/;

export function parsePassDateTime(dateValue: string, timeValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const utcTime = Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MINUTES * 60 * 1000;
  const date = new Date(utcTime);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPassDateInput(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PASS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseDateOnly(dateValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPassTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PASS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
}

export function formatDisplayPassTime(value: unknown, requestedValue?: unknown) {
  if (typeof requestedValue === "string" && PASS_TIME_PATTERN.test(requestedValue)) {
    return requestedValue;
  }

  return value instanceof Date ? formatPassTime(value) : value;
}
