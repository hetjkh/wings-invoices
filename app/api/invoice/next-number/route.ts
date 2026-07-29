import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { InvoiceDocument } from "@/models/Invoice";
import { getMaxInvoiceNumberValue, parseInvoiceNumberValue } from "@/lib/helpers";
import { ObjectId } from "mongodb";

/**
 * GET /api/invoice/next-number
 * Returns the next available invoice number for the current user.
 * Optional query: ?number=123 to also check if that number already exists.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const invoicesCollection = db.collection<InvoiceDocument>("invoices");
        const userId = new ObjectId(user.userId);

        const invoices = await invoicesCollection
            .find(
                { userId },
                { projection: { "details.invoiceNumber": 1 } }
            )
            .toArray();

        const invoiceNumbers = invoices.map(
            (invoice) => invoice.details?.invoiceNumber
        );
        const lastNumber = getMaxInvoiceNumberValue(invoiceNumbers);
        const nextNumber = (lastNumber + 1).toString();

        const { searchParams } = new URL(req.url);
        const checkNumber = searchParams.get("number")?.trim();

        let exists = false;
        if (checkNumber) {
            const existing = await invoicesCollection.findOne({
                userId,
                "details.invoiceNumber": checkNumber,
            });
            exists = !!existing;
        }

        return NextResponse.json({
            lastNumber: lastNumber > 0 ? lastNumber.toString() : null,
            nextNumber,
            exists,
            checkedNumber: checkNumber || null,
            checkedNumberValue: checkNumber
                ? parseInvoiceNumberValue(checkNumber)
                : null,
        });
    } catch (error) {
        console.error("Next invoice number error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
