import { describe, expect, it } from 'vitest';
import { extractUploadText, isPdf } from './extract.ts';
import { ApiError } from './middleware/errors.ts';

const encoder = new TextEncoder();
const LIMIT = 10_000;

/** Smallest well-formed single-page PDF that draws one line of Helvetica text. */
export function buildTinyPdf(content: string): Uint8Array {
  const stream = `BT /F1 18 Tf 40 700 Td (${content}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R ' +
      '/Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${String(stream.length)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${String(index + 1)} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\n`;
  pdf += `startxref\n${String(xref)}\n%%EOF\n`;
  return encoder.encode(pdf);
}

async function expectApiError(
  promise: Promise<unknown>,
  status: number,
  code: string,
): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(status);
  expect((error as ApiError).code).toBe(code);
}

describe('isPdf', () => {
  it('recognises the signature and nothing else', () => {
    expect(isPdf(encoder.encode('%PDF-1.7 rest'))).toBe(true);
    expect(isPdf(encoder.encode('%PDF'))).toBe(false);
    expect(isPdf(encoder.encode('hello'))).toBe(false);
  });
});

describe('extractUploadText', () => {
  it('returns UTF-8 text as-is', async () => {
    await expect(
      extractUploadText(encoder.encode('Notice: pay $10 by June.'), LIMIT),
    ).resolves.toBe('Notice: pay $10 by June.');
  });

  it('extracts the text layer of a PDF', async () => {
    const text = await extractUploadText(buildTinyPdf('Hello docket within 30 days'), LIMIT);
    expect(text).toContain('Hello docket within 30 days');
  });

  it('rejects a broken PDF with a plain-language 400', async () => {
    await expectApiError(
      extractUploadText(encoder.encode('%PDF-1.4 not really a pdf'), LIMIT),
      400,
      'UNREADABLE_PDF',
    );
  });

  it('rejects binaries such as PNG or EXE with 415', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe]);
    await expectApiError(extractUploadText(png, LIMIT), 415, 'UNSUPPORTED_MEDIA_TYPE');
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    await expectApiError(extractUploadText(exe, LIMIT), 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects files over the size limit with 413', async () => {
    const big = new Uint8Array(LIMIT + 1).fill(0x61);
    await expectApiError(extractUploadText(big, LIMIT), 413, 'PAYLOAD_TOO_LARGE');
  });
});
