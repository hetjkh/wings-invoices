export type InvoiceListFilterParams = {
    search?: string;
    filterType?: "all" | "sender" | "receiver";
    dateFrom?: string;
    dateTo?: string;
    amountMin?: string;
    amountMax?: string;
    currency?: string;
    sort?: string;
};

export function parseInvoiceListParams(searchParams: URLSearchParams): InvoiceListFilterParams {
    return {
        search: searchParams.get("search") || undefined,
        filterType: (searchParams.get("filterType") as InvoiceListFilterParams["filterType"]) || "all",
        dateFrom: searchParams.get("dateFrom") || undefined,
        dateTo: searchParams.get("dateTo") || undefined,
        amountMin: searchParams.get("amountMin") || undefined,
        amountMax: searchParams.get("amountMax") || undefined,
        currency: searchParams.get("currency") || undefined,
        sort: searchParams.get("sort") || "date-desc",
    };
}

export function buildInvoiceListQueryString(
    skip: number,
    limit: number,
    params: InvoiceListFilterParams
): string {
    const qs = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
    });
    if (params.search) qs.set("search", params.search);
    if (params.filterType && params.filterType !== "all") qs.set("filterType", params.filterType);
    if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params.dateTo) qs.set("dateTo", params.dateTo);
    if (params.amountMin) qs.set("amountMin", params.amountMin);
    if (params.amountMax) qs.set("amountMax", params.amountMax);
    if (params.currency && params.currency !== "all") qs.set("currency", params.currency);
    if (params.sort) qs.set("sort", params.sort);
    return qs.toString();
}
