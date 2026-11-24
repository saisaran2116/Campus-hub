// Allow HTTP(S) URLs and local paths, while rejecting script URLs and redirects
// such as //external.example or backslash variants interpreted by browsers.
export function isValidSafeUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "Not specified" || trimmed === "Needs verification") return true;
  if (/[\u0000-\u0020\u007f\\]/.test(trimmed)) return false;
  if (trimmed.startsWith("/")) return !trimmed.startsWith("//");
  try {
    const url = new URL(trimmed);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function sanitizeUrl(value: string | null | undefined, fallback = "Not specified"): string {
  if (!value || !isValidSafeUrl(value)) return fallback;
  return value.trim();
}
