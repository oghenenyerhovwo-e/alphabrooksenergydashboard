/**
 * Renders the A4 delivery note element (794 x 1123 px) into a single-page A4
 * PDF, entirely in the browser.
 *
 * Size matters: the request goes to a serverless function (Vercel caps the
 * body at ~4.5 MB). Embedding a full-page PNG makes jsPDF store raw pixels
 * (many MB), so we embed a JPEG and enable PDF compression instead — a note
 * comes out at a few hundred KB.
 */
export async function generateDeliveryNotePdfBase64(
  element: HTMLElement
): Promise<string> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const imageData = canvas.toDataURL("image/jpeg", 0.88);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // The element is exactly A4-proportioned, so it fills the page.
  pdf.addImage(imageData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

  const dataUri = pdf.output("datauristring");
  const base64 = dataUri.split(",")[1] ?? "";
  return base64;
}

/** e.g. QDN-260927-4821 */
export function generateQuickNoteNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `QDN-${yy}${mm}${dd}-${random}`;
}