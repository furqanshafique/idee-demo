// Real PDF parsing (pdf.js): SHA-256 of the bytes + text per page.
const pdfjs = window.pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_PAGES = 40;

export async function sha256Hex(bytes) {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function looksLikePdf(bytes) {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
  return head.includes('%PDF-');
}

// Returns { sha256, pages, pageTexts } or throws a German error message.
export async function readPdf(bytes) {
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('Datei größer als 15 MB.');
  if (!looksLikePdf(bytes)) throw new Error('Keine PDF-Datei (Signatur %PDF fehlt). Nur PDF wird unterstützt.');
  const sha256 = await sha256Hex(bytes);
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: bytes.slice(0), isEvalSupported: false }).promise;
  } catch (e) {
    throw new Error(`PDF nicht lesbar: ${e.message || e}`);
  }
  const n = Math.min(doc.numPages, MAX_PAGES);
  const pageTexts = [];
  for (let i = 1; i <= n; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    pageTexts.push(tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ').trim());
  }
  return { sha256, pages: doc.numPages, pageTexts, truncated: doc.numPages > MAX_PAGES };
}
