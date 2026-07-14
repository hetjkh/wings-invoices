import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { InvoiceDocument } from "@/models/Invoice";
import { InvoiceType } from "@/types";
import { SHORT_DATE_OPTIONS } from "@/lib/variables";
import { withDefaultBrandAssets } from "@/lib/brandAssets";
import { parseInvoiceListParams } from "@/lib/invoiceListQuery";
import {
    buildInvoiceListFilter,
    buildInvoiceListSort,
} from "@/lib/invoiceListQuery.server";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "5", 10);
        const skip = parseInt(searchParams.get("skip") || "0", 10);
        const filterParams = parseInvoiceListParams(searchParams);
        const filter = buildInvoiceListFilter(user.userId, filterParams);
        const sort = buildInvoiceListSort(filterParams.sort);

        const db = await getDb();
        const invoicesCollection = db.collection<InvoiceDocument>("invoices");

        const [filteredCount, statsRows, invoices] = await Promise.all([
            invoicesCollection.countDocuments(filter),
            invoicesCollection
                .aggregate([
                    { $match: filter },
                    {
                        $group: {
                            _id: null,
                            totalAmount: {
                                $sum: {
                                    $convert: {
                                        input: "$details.totalAmount",
                                        to: "double",
                                        onError: 0,
                                        onNull: 0,
                                    },
                                },
                            },
                            currencies: { $addToSet: "$details.currency" },
                        },
                    },
                ])
                .toArray(),
            invoicesCollection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
        ]);

        const totalCount = await invoicesCollection.countDocuments({
            userId: filter.userId,
        });

        const statsDoc = statsRows[0] as
            | { totalAmount?: number; currencies?: string[] }
            | undefined;

        const formattedInvoices = invoices.map((invoice) => {
            const { _id, userId, createdAt, updatedAt, ...invoiceData } = invoice;
            const updatedAtString = updatedAt
                ? new Date(updatedAt).toLocaleDateString("en-US", SHORT_DATE_OPTIONS)
                : new Date().toLocaleDateString("en-US", SHORT_DATE_OPTIONS);

            const branded = withDefaultBrandAssets(invoiceData as InvoiceType);
            return {
                ...branded,
                id: _id!.toString(),
                details: {
                    ...branded.details,
                    updatedAt: updatedAtString,
                },
            };
        });

        const response = NextResponse.json(
            {
                invoices: formattedInvoices,
                totalCount,
                filteredCount,
                hasMore: skip + limit < filteredCount,
                stats: {
                    matchingCount: filteredCount,
                    totalAmount: statsDoc?.totalAmount ?? 0,
                    uniqueCurrencies: (statsDoc?.currencies ?? []).filter(Boolean).length,
                },
            },
            { status: 200 }
        );

        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");

        return response;
    } catch (error) {
        console.error("Get invoices error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
