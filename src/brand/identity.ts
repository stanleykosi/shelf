import wordmark from "./wordmark.json";

/** The shared artwork for the app, downloadable logos and social images. */
export const brandColors = {
  ink: "#111715",
  mint: "#b6efd2",
  paper: "#f5f5ef",
  forest: "#254b39",
  sage: "#b6c7bb",
} as const;

// Three horizontal shelves joined into an S. Keep this geometry at every size.
export const shelfSymbolPath = "M56 8H20C13.373 8 8 13.373 8 20V26C8 32.627 13.373 38 20 38H44V44H8V56H44C50.627 56 56 50.627 56 44V38C56 31.373 50.627 26 44 26H20V20H56V8Z";

// Raleway SemiBold, outlined from the bundled OFL font. No font loading needed.
export const shelfWordmark = wordmark;
export const wordmarkScale = 44 / wordmark.height;
export const logoWidth = Math.ceil(78 + wordmark.width * wordmarkScale);
export const brandDescription = "Discover the companies behind familiar products. Explore, understand, and build your own shelf.";
