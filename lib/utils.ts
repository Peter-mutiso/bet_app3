import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Kenyan currency.
 */
export function fmtKE(value: number | string = 0) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

/**
 * Format Kenyan date.
 */
export function fmtKEDate(
  date: Date | string | number = new Date()
) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeZone: "Africa/Nairobi",
  }).format(new Date(date));
}

/**
 * Format Kenyan time.
 */
export function fmtKETime(
  date: Date | string | number = new Date()
) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(new Date(date));
}

/**
 * Format numbers.
 */
export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

/**
 * Clamp a number.
 */
export function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Mask phone number.
 */
export function maskPhone(phone: string): string {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");

  if (digits.length <= 7) {
    return phone;
  }

  const start = digits.length > 10 ? 5 : 4;

  return `${digits.slice(0, start)}****${digits.slice(-3)}`;
}