import { Filter, Sort } from "mongodb";
import { ObjectId } from "mongodb";

import type { InvoiceListFilterParams } from "@/lib/invoiceListQuery";

export function buildInvoiceListFilter(
    userId: string,
    params: InvoiceListFilterParams
): Filter<Record<string, unknown>> {
    const filter: Filter<Record<string, unknown>> = {
        userId: new ObjectId(userId),
    };

    const search = params.search?.trim();
    if (search) {
        const regex = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        if (params.filterType === "sender") {
            filter["sender.name"] = regex;
        } else if (params.filterType === "receiver") {
            filter["receiver.name"] = regex;
        } else {
            filter.$or = [
                { "details.invoiceNumber": regex },
                { "sender.name": regex },
                { "receiver.name": regex },
            ];
        }
    }

    if (params.dateFrom || params.dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (params.dateFrom) {
            dateFilter.$gte = new Date(params.dateFrom);
        }
        if (params.dateTo) {
            const to = new Date(params.dateTo);
            to.setHours(23, 59, 59, 999);
            dateFilter.$lte = to;
        }
        filter["details.invoiceDate"] = dateFilter;
    }

    if (params.amountMin || params.amountMax) {
        const amountExprs: Record<string, unknown>[] = [];
        if (params.amountMin) {
            amountExprs.push({
                $gte: [{ $toDouble: { $ifNull: ["$details.totalAmount", 0] } }, Number(params.amountMin)],
            });
        }
        if (params.amountMax) {
            amountExprs.push({
                $lte: [{ $toDouble: { $ifNull: ["$details.totalAmount", 0] } }, Number(params.amountMax)],
            });
        }
        if (amountExprs.length === 1) {
            filter.$expr = amountExprs[0];
        } else if (amountExprs.length > 1) {
            filter.$expr = { $and: amountExprs };
        }
    }

    if (params.currency && params.currency !== "all") {
        filter["details.currency"] = params.currency;
    }

    return filter;
}

export function buildInvoiceListSort(sortType?: string): Sort {
    switch (sortType) {
        case "date-asc":
            return { updatedAt: 1 };
        case "amount-desc":
            return { "details.totalAmount": -1 };
        case "amount-asc":
            return { "details.totalAmount": 1 };
        case "invoice-number":
            return { "details.invoiceNumber": 1 };
        case "sender-name":
            return { "sender.name": 1 };
        case "receiver-name":
            return { "receiver.name": 1 };
        case "date-desc":
        default:
            return { updatedAt: -1 };
    }
}
