import { InvoiceType } from "@/types";

import {
    DEFAULT_INVOICE_LOGO,
    DEFAULT_INVOICE_SIGNATURE,
} from "@/lib/variables";

export { DEFAULT_INVOICE_LOGO, DEFAULT_INVOICE_SIGNATURE };

/**
 * Logo for display (browser). Keeps data: URLs from PDF embedding.
 */
export function resolveInvoiceLogo(value?: string | null): string {
    if (value?.startsWith("data:")) return value;
    return DEFAULT_INVOICE_LOGO;
}

/**
 * Signature for display (browser). Keeps data: URLs from PDF embedding.
 */
export function resolveInvoiceSignature(value?: string | null): string {
    if (value?.startsWith("data:")) return value;
    return DEFAULT_INVOICE_SIGNATURE;
}

/**
 * Force default logo and signature on an invoice (ignores stored custom/Cloudinary values).
 */
export function applyInvoiceBranding<T extends InvoiceType>(invoice: T): T {
    return {
        ...invoice,
        details: {
            ...invoice.details,
            invoiceLogo: DEFAULT_INVOICE_LOGO,
            signature: {
                ...invoice.details.signature,
                data: DEFAULT_INVOICE_SIGNATURE,
            },
        },
    };
}
