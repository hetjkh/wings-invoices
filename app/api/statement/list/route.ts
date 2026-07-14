import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { StatementDocument } from "@/models/Statement";
import { SHORT_DATE_OPTIONS } from "@/lib/variables";
import { ObjectId } from "mongodb";
import {
    statementListAggregationPipeline,
    statementStatsAggregationPipeline,
    type StatementListSummary,
} from "@/lib/statementListQuery.server";

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
        const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
        const skip = parseInt(searchParams.get("skip") || "0", 10);
        const clientEmail = searchParams.get("clientEmail") || undefined;

        const db = await getDb();
        const statementsCollection = db.collection<StatementDocument>("statements");
        const userId = user.userId;

        const matchFilter = {
            userId: new ObjectId(userId),
            ...(clientEmail ? { clientEmail: clientEmail.toLowerCase() } : {}),
        };

        const [statsRows, listRows, totalCount] = await Promise.all([
            statementsCollection
                .aggregate(statementStatsAggregationPipeline(userId, clientEmail), {
                    allowDiskUse: true,
                })
                .toArray(),
            statementsCollection
                .aggregate(statementListAggregationPipeline(userId, skip, limit, clientEmail), {
                    allowDiskUse: true,
                })
                .toArray(),
            statementsCollection.countDocuments(matchFilter),
        ]);

        const statsDoc = statsRows[0] as
            | {
                  statementCount?: number;
                  totalInvoices?: number;
                  totalAmount?: number;
                  currencies?: string[];
              }
            | undefined;

        const formattedStatements: StatementListSummary[] = listRows.map((row) => {
            const doc = row as StatementDocument & {
                invoiceCount: number;
                totalAmount: number;
                currency: string;
            };
            const { _id, createdAt, updatedAt, ...rest } = doc;
            return {
                title: rest.title,
                clientEmail: rest.clientEmail,
                clientId: rest.clientId?.toString(),
                billedToName: rest.billedToName,
                statementDateFrom: rest.statementDateFrom,
                statementDateTo: rest.statementDateTo,
                invoiceCount: rest.invoiceCount ?? 0,
                totalAmount: rest.totalAmount ?? 0,
                currency: rest.currency || "USD",
                id: _id!.toString(),
                createdAt: createdAt
                    ? new Date(createdAt).toLocaleDateString("en-US", SHORT_DATE_OPTIONS)
                    : "",
                updatedAt: updatedAt
                    ? new Date(updatedAt).toLocaleDateString("en-US", SHORT_DATE_OPTIONS)
                    : new Date().toLocaleDateString("en-US", SHORT_DATE_OPTIONS),
            };
        });

        const filteredCount = statsDoc?.statementCount ?? totalCount;

        const response = NextResponse.json(
            {
                statements: formattedStatements,
                totalCount,
                filteredCount,
                hasMore: skip + limit < filteredCount,
                stats: {
                    matchingCount: filteredCount,
                    totalInvoices: statsDoc?.totalInvoices ?? 0,
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
        console.error("Get statements error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
