export async function prepareScanImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG or WebP image. HEIC, PDF and video are not supported.");
  }
  if (file.size > 8 * 1024 * 1024) throw new Error("Image is larger than 8 MiB. Choose another image.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("This image could not be decoded. Choose another image."); });
  try {
    if (bitmap.width * bitmap.height > 20_000_000) throw new Error("Image exceeds 20 megapixels. Crop it before choosing it again.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image preparation is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const prepared = canvas.toDataURL("image/jpeg", 0.85);
    if (prepared.length * 0.75 > 3 * 1024 * 1024) throw new Error("Prepared image is too large. Crop it before choosing it again.");
    return prepared;
  } finally { bitmap.close(); }
}
