import { ObjectId } from "mongodb";

/** Lightweight list row — full invoices loaded on demand via GET /api/statement/[id] */
export type StatementListSummary = {
    id: string;
    title?: string;
    clientEmail: string;
    clientId?: string;
    billedToName?: string;
    statementDateFrom?: string;
    statementDateTo?: string;
    createdAt: string;
    updatedAt: string;
    invoiceCount: number;
    totalAmount: number;
    currency: string;
};

export function statementListAggregationPipeline(
    userId: string,
    skip: number,
    limit: number,
    clientEmail?: string
) {
    const match: Record<string, unknown> = {
        userId: new ObjectId(userId),
    };
    if (clientEmail) {
        match.clientEmail = clientEmail.toLowerCase();
    }

    return [
        { $match: match },
        {
            $project: {
                title: 1,
                clientEmail: 1,
                clientId: 1,
                billedToName: 1,
                statementDateFrom: 1,
                statementDateTo: 1,
                createdAt: 1,
                updatedAt: 1,
                invoiceCount: { $size: { $ifNull: ["$invoices", []] } },
                totalAmount: {
                    $sum: {
                        $map: {
                            input: { $ifNull: ["$invoices", []] },
                            as: "inv",
                            in: {
                                $convert: {
                                    input: "$$inv.details.totalAmount",
                                    to: "double",
                                    onError: 0,
                                    onNull: 0,
                                },
                            },
                        },
                    },
                },
                currency: {
                    $ifNull: [
                        { $arrayElemAt: ["$invoices.details.currency", 0] },
                        "USD",
                    ],
                },
            },
        },
        { $sort: { updatedAt: -1 } },
        { $skip: skip },
        { $limit: limit },
    ];
}

export function statementStatsAggregationPipeline(userId: string, clientEmail?: string) {
    const match: Record<string, unknown> = {
        userId: new ObjectId(userId),
    };
    if (clientEmail) {
        match.clientEmail = clientEmail.toLowerCase();
    }

    return [
        { $match: match },
        {
            $project: {
                invoiceCount: { $size: { $ifNull: ["$invoices", []] } },
                totalAmount: {
                    $sum: {
                        $map: {
                            input: { $ifNull: ["$invoices", []] },
                            as: "inv",
                            in: {
                                $convert: {
                                    input: "$$inv.details.totalAmount",
                                    to: "double",
                                    onError: 0,
                                    onNull: 0,
                                },
                            },
                        },
                    },
                },
                currency: { $arrayElemAt: ["$invoices.details.currency", 0] },
            },
        },
        {
            $group: {
                _id: null,
                statementCount: { $sum: 1 },
                totalInvoices: { $sum: "$invoiceCount" },
                totalAmount: { $sum: "$totalAmount" },
                currencies: { $addToSet: "$currency" },
            },
        },
    ];
}
