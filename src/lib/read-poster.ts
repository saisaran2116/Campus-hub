export const imageTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Promises vs callbacks: callers await this adapter around FileReader events.
export function readPoster(file: File): Promise<string> {
  // Hoisting: this function declaration is callable before its definition below.
  validatePoster(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the poster."));
    reader.onabort = () => reject(new Error("Poster reading was cancelled."));
    reader.readAsDataURL(file);
  });
}

function validatePoster(file: File) {
  if (!imageTypes.includes(file.type) || file.size > 6 * 1024 * 1024) {
    throw new Error("Choose a PNG, JPEG, WebP, or GIF image up to 6 MB.");
  }
}
