import { extractText } from 'unpdf';
import { ApiError } from './middleware/errors.ts';

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const NUL_BYTE = 0;
const BYTES_PER_MB = 1_000_000;

const UNSUPPORTED = new ApiError(
  415,
  'UNSUPPORTED_MEDIA_TYPE',
  'Only plain text (.txt) and PDF (.pdf) files are supported. Please paste the text instead.',
);
const UNREADABLE_PDF = new ApiError(
  400,
  'UNREADABLE_PDF',
  'We could not read text from that PDF. If it is a scanned image, please paste the text instead.',
);

/** True when the bytes start with the PDF signature; the file name and MIME type are ignored. */
export function isPdf(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, index) => bytes[index] === byte);
}

function decodeUtf8(bytes: Uint8Array): string | undefined {
  if (bytes.includes(NUL_BYTE)) return undefined;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

async function readPdf(bytes: Uint8Array): Promise<string> {
  let text: string;
  try {
    ({ text } = await extractText(bytes, { mergePages: true }));
  } catch {
    throw UNREADABLE_PDF;
  }
  if (text.trim().length === 0) throw UNREADABLE_PDF;
  return text;
}

/**
 * Turns an uploaded file into text. The type is decided from the bytes, never from the file
 * name or the client-supplied MIME type, so a renamed binary cannot slip through; anything
 * that is neither a PDF nor valid UTF-8 text is rejected with 415.
 */
export async function extractUploadText(bytes: Uint8Array, maxBytes: number): Promise<string> {
  if (bytes.byteLength > maxBytes) {
    const limitMb = (maxBytes / BYTES_PER_MB).toFixed(1);
    throw new ApiError(
      413,
      'PAYLOAD_TOO_LARGE',
      `The file is larger than ${limitMb} MB. Please upload a smaller file or paste the text.`,
    );
  }
  if (isPdf(bytes)) return readPdf(bytes);
  const text = decodeUtf8(bytes);
  if (text === undefined) throw UNSUPPORTED;
  return text;
}
