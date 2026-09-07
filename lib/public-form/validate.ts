import type { RenderableField } from "@/components/public-form/field-preview";

export interface ValidationResult {
  errors: Record<string, string>;
  /** Cleaned values, keyed by field_key. Checkbox groups are joined with ", ". */
  values: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[0-9+][0-9+\-\s]{6,14}$/;

/**
 * Validates raw submitted values against the form's ACTIVE field definitions
 * fetched server-side - never against whatever field list the client claims
 * to have rendered. This is what actually enforces "required" and basic
 * type checks; client-side validation is just UX.
 */
export function validateSubmission(
  fields: RenderableField[],
  raw: Record<string, unknown>
): ValidationResult {
  const errors: Record<string, string> = {};
  const values: Record<string, string> = {};

  for (const field of fields) {
    const rawValue = raw[field.field_key];

    if (Array.isArray(rawValue)) {
      values[field.field_key] = rawValue.filter((v) => typeof v === "string").join(", ");
    } else {
      values[field.field_key] = typeof rawValue === "string" ? rawValue.trim() : "";
    }

    const value = values[field.field_key];

    if (field.is_required && !value) {
      errors[field.field_key] = `${field.label} is required`;
      continue;
    }
    if (!value) continue;

    if (field.field_type === "email" && !EMAIL_RE.test(value)) {
      errors[field.field_key] = "Enter a valid email address";
    }
    if (field.field_type === "mobile" && !MOBILE_RE.test(value)) {
      errors[field.field_key] = "Enter a valid mobile number";
    }
    if (
      field.field_type === "consent" &&
      field.is_required &&
      value !== "true" &&
      value !== "on"
    ) {
      errors[field.field_key] = "You must agree to continue";
    }
    if (
      (field.field_type === "dropdown" || field.field_type === "radio") &&
      field.options &&
      !field.options.includes(value)
    ) {
      errors[field.field_key] = "Choose one of the listed options";
    }
  }

  return { errors, values };
}
