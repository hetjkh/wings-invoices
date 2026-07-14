import fs from "fs";
import path from "path";

import { InvoiceType } from "@/types";

import { applyInvoiceBranding } from "@/lib/branding";
import { DEFAULT_INVOICE_SIGNATURE } from "@/lib/variables";

function getAssetPaths(filename: string): string[] {
    const cwd = process.cwd();
    return [
        path.join(cwd, "public", "assets", filename),
        path.join(cwd, "..", "public", "assets", filename),
    ];
}

function readAssetAsDataUrl(filename: string): string | null {
    for (const filePath of getAssetPaths(filename)) {
        try {
            if (fs.existsSync(filePath)) {
                const buffer = fs.readFileSync(filePath);
                const ext = path.extname(filename).toLowerCase();
                const mime =
                    ext === ".jpg" || ext === ".jpeg"
                        ? "image/jpeg"
                        : ext === ".gif"
                          ? "image/gif"
                          : ext === ".webp"
                            ? "image/webp"
                            : ext === ".avif"
                              ? "image/avif"
                              : "image/png";
                return `data:${mime};base64,${buffer.toString("base64")}`;
            }
        } catch {
            // try next path
        }
    }
    return null;
}

/**
 * Embed logo and signature as data URLs for Puppeteer PDF generation.
 * Server-only — uses Node fs.
 */
export async function embedBrandingForPdf(
    invoice: InvoiceType
): Promise<InvoiceType> {
    const branded = applyInvoiceBranding(invoice);
    const logoDataUrl = readAssetAsDataUrl("logo.avif");
    const signatureDataUrl = readAssetAsDataUrl("sign.jpeg");

    return {
        ...branded,
        details: {
            ...branded.details,
            invoiceLogo: logoDataUrl ?? branded.details.invoiceLogo,
            signature: {
                ...branded.details.signature,
                data:
                    signatureDataUrl ??
                    branded.details.signature?.data ??
                    DEFAULT_INVOICE_SIGNATURE,
            },
        },
    };
}
