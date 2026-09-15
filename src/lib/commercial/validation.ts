export interface FieldErrors {
  [key: string]: string;
}

export function requiredString(
  formData: FormData,
  key: string
): string | null {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

export function optionalString(
  formData: FormData,
  key: string
): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}

export function optionalNumber(
  formData: FormData,
  key: string
): number | undefined {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return undefined;
  }

  return number;
}

export function optionalDate(
  formData: FormData,
  key: string
): Date | undefined {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

const VALID_LEAD_SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "SALES",
  "BUSINESS_DEVELOPMENT",
  "PHONE",
  "EMAIL",
  "WHATSAPP",
  "OTHER",
] as const;

export function isValidLeadSource(value: string): boolean {
  return (VALID_LEAD_SOURCES as readonly string[]).includes(value);
}

const VALID_PRODUCTS = [
  "CNG",
  "AGO",
  "PMS",
  "LPG_BULK",
  "LPG_CYLINDERS",
  "OTHER",
] as const;

export function isValidProduct(value: string): boolean {
  return (VALID_PRODUCTS as readonly string[]).includes(value);
}

const VALID_UNITS = ["SCM", "KG", "MT", "LITRES", "OTHER"] as const;

export function isValidUnit(value: string): boolean {
  return (VALID_UNITS as readonly string[]).includes(value);
}