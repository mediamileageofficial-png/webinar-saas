import "server-only";
import QRCode from "qrcode";

/** Generates a PNG data URL for the given text/URL - safe to embed directly in an <img src>. */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 320 });
}
