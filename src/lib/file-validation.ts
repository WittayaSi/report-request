/**
 * Validate file type by checking magic bytes (file signature).
 * This prevents spoofed MIME types from client.
 */

interface FileSignature {
  mimeType: string;
  magicBytes: number[];
  offset?: number; // Default 0
}

const FILE_SIGNATURES: FileSignature[] = [
  // PDF
  { mimeType: "application/pdf", magicBytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  
  // PNG
  { mimeType: "image/png", magicBytes: [0x89, 0x50, 0x4e, 0x47] },
  
  // JPEG
  { mimeType: "image/jpeg", magicBytes: [0xff, 0xd8, 0xff] },
  
  // GIF87a & GIF89a
  { mimeType: "image/gif", magicBytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  
  // WebP
  { mimeType: "image/webp", magicBytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF (check WEBP at offset 8)
  
  // ZIP (also xlsx, docx, pptx, etc.)
  { mimeType: "application/zip", magicBytes: [0x50, 0x4b, 0x03, 0x04] }, // PK..
  
  // Old Office formats - xls, doc, ppt (OLE2 Compound Document)
  { mimeType: "application/msword", magicBytes: [0xd0, 0xcf, 0x11, 0xe0] },
  
  // CSV/Text — no reliable magic bytes, allow by extension
];

// MIME types that use ZIP container internally (Office XML)
const ZIP_BASED_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
];

// MIME types that use OLE2 container (old Office)
const OLE2_BASED_MIMES = [
  "application/vnd.ms-excel", // xls
  "application/msword", // doc
];

// Text-based formats that have no reliable magic bytes
const TEXT_BASED_MIMES = [
  "text/csv",
];

/**
 * Validate a file's content against its declared MIME type.
 * @param buffer - First 16 bytes of the file
 * @param declaredMime - MIME type from client
 * @returns true if valid, false if spoofed
 */
export function validateFileMagicBytes(
  buffer: Buffer,
  declaredMime: string
): boolean {
  // Text-based formats — can't validate by magic bytes
  if (TEXT_BASED_MIMES.includes(declaredMime)) {
    return true;
  }

  // ZIP-based Office formats (xlsx, docx) — should start with PK..
  if (ZIP_BASED_MIMES.includes(declaredMime)) {
    return matchesSignature(buffer, { mimeType: "application/zip", magicBytes: [0x50, 0x4b, 0x03, 0x04] });
  }

  // OLE2-based Office formats (xls, doc) — should start with D0 CF 11 E0
  if (OLE2_BASED_MIMES.includes(declaredMime)) {
    return matchesSignature(buffer, { mimeType: "application/msword", magicBytes: [0xd0, 0xcf, 0x11, 0xe0] });
  }

  // Find expected signature for this MIME type
  const expectedSig = FILE_SIGNATURES.find(s => s.mimeType === declaredMime);
  if (!expectedSig) {
    // Unknown type — reject by default for safety
    return false;
  }

  return matchesSignature(buffer, expectedSig);
}

function matchesSignature(buffer: Buffer, sig: FileSignature): boolean {
  const offset = sig.offset || 0;
  if (buffer.length < offset + sig.magicBytes.length) {
    return false;
  }

  return sig.magicBytes.every(
    (byte, i) => buffer[offset + i] === byte
  );
}
