"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    Building2,
    ChevronDown,
    ChevronUp,
    Download,
    Eye,
    FileText,
    Filter,
    Loader2,
    Mail,
    Receipt,
    Search,
    SlidersHorizontal,
    Trash2,
    Wallet,
    X,
} from "lucide-react";

import StatementPreviewModal from "@/app/components/modals/invoice/StatementPreviewModal";
import { useAuth } from "@/contexts/AuthContext";
import { formatNumberWithCommas } from "@/lib/helpers";
import { InvoiceType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SavedStatement = {
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
    invoices?: InvoiceType[];
};

type StatementListStats = {
    matchingCount: number;
    totalInvoices: number;
    totalAmount: number;
    uniqueCurrencies: number;
};

type SortType = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "invoices-desc" | "invoices-asc";

const getStatementTotal = (statement: SavedStatement) =>
    statement.totalAmount ??
    (statement.invoices?.reduce(
        (sum, inv) => sum + (Number(inv.details?.totalAmount) || 0),
        0
    ) ?? 0);

const getStatementCurrency = (statement: SavedStatement) =>
    statement.currency || statement.invoices?.[0]?.details?.currency || "USD";

const getStatementInvoiceCount = (statement: SavedStatement) =>
    statement.invoiceCount ?? statement.invoices?.length ?? 0;

const SavedStatementsList = () => {
    const { user } = useAuth();
    const [statements, setStatements] = useState<SavedStatement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortType, setSortType] = useState<SortType>("date-desc");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [clientFilter, setClientFilter] = useState("all");
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewStatement, setPreviewStatement] = useState<SavedStatement | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [loadingStatementId, setLoadingStatementId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [filteredCount, setFilteredCount] = useState(0);
    const [listStats, setListStats] = useState<StatementListStats>({
        matchingCount: 0,
        totalInvoices: 0,
        totalAmount: 0,
        uniqueCurrencies: 0,
    });

    const fetchStatements = useCallback(
        async (append = false, clientEmail?: string, skip = 0) => {
            if (!user) {
                setStatements([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    limit: "20",
                    skip: String(skip),
                    t: String(Date.now()),
                });
                if (clientEmail && clientEmail !== "all") {
                    params.set("clientEmail", clientEmail);
                }
                const response = await fetch(`/api/statement/list?${params}`, {
                    cache: "no-store",
                });
                if (response.ok) {
                    const data = await response.json();
                    const list = (data.statements || []) as SavedStatement[];
                    setStatements((prev) => (append ? [...prev, ...list] : list));
                    setHasMore(data.hasMore || false);
                    setFilteredCount(data.filteredCount ?? list.length);
                    if (data.stats) {
                        setListStats(data.stats);
                    }
                }
            } catch (error) {
                console.error("Error fetching statements:", error);
            } finally {
                setLoading(false);
            }
        },
        [user]
    );

    useEffect(() => {
        fetchStatements(false, clientFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        if (!user) return;
        fetchStatements(false, clientFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientFilter]);

    useEffect(() => {
        const onDeleted = () => fetchStatements(false, clientFilter);
        window.addEventListener("statementDeleted", onDeleted);
        return () => window.removeEventListener("statementDeleted", onDeleted);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientFilter]);

    const uniqueClients = useMemo(() => {
        const emails = new Set<string>();
        statements.forEach((s) => {
            if (s.clientEmail) emails.add(s.clientEmail);
        });
        return Array.from(emails).sort();
    }, [statements]);

    const filteredStatements = useMemo(() => {
        let list = [...statements];
        const q = searchQuery.toLowerCase().trim();

        if (clientFilter !== "all") {
            list = list.filter((s) => s.clientEmail === clientFilter);
        }

        if (q) {
            list = list.filter((s) => {
                const title = (s.title || "").toLowerCase();
                const billed = (s.billedToName || "").toLowerCase();
                const email = (s.clientEmail || "").toLowerCase();
                return title.includes(q) || billed.includes(q) || email.includes(q);
            });
        }

        list.sort((a, b) => {
            switch (sortType) {
                case "date-asc":
                    return (a.updatedAt || "").localeCompare(b.updatedAt || "");
                case "amount-desc":
                    return getStatementTotal(b) - getStatementTotal(a);
                case "amount-asc":
                    return getStatementTotal(a) - getStatementTotal(b);
                case "invoices-desc":
                    return getStatementInvoiceCount(b) - getStatementInvoiceCount(a);
                case "invoices-asc":
                    return getStatementInvoiceCount(a) - getStatementInvoiceCount(b);
                default:
                    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
            }
        });

        return list;
    }, [statements, searchQuery, sortType, clientFilter]);

    const statistics = useMemo(() => {
        if (!searchQuery.trim()) {
            return {
                totalStatements: listStats.matchingCount,
                totalInvoices: listStats.totalInvoices,
                totalAmount: listStats.totalAmount,
                uniqueClients: listStats.uniqueCurrencies,
            };
        }
        const totalInvoices = filteredStatements.reduce((n, s) => n + getStatementInvoiceCount(s), 0);
        const totalAmount = filteredStatements.reduce((sum, s) => sum + getStatementTotal(s), 0);
        const clients = new Set(filteredStatements.map((s) => s.clientEmail));
        return {
            totalStatements: filteredStatements.length,
            totalInvoices,
            totalAmount,
            uniqueClients: clients.size,
        };
    }, [filteredStatements, listStats, searchQuery]);

    const hasActiveFilters = !!searchQuery || clientFilter !== "all";

    const clearFilters = () => {
        setSearchQuery("");
        setClientFilter("all");
    };

    const handleLoad = async (statement: SavedStatement) => {
        setLoadingStatementId(statement.id);
        try {
            const response = await fetch(`/api/statement/${statement.id}`);
            if (!response.ok) {
                throw new Error("Failed to load statement");
            }
            const data = await response.json();
            const full = data.statement as SavedStatement & { invoices: InvoiceType[] };
            setPreviewStatement({
                ...statement,
                ...full,
                id: statement.id,
                invoices: full.invoices || [],
            });
            setPreviewOpen(true);
        } catch (error) {
            console.error("Error loading statement:", error);
            alert("Failed to load statement. Please try again.");
        } finally {
            setLoadingStatementId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this statement?")) return;
        setDeletingId(id);
        try {
            const response = await fetch(`/api/statement/${id}`, { method: "DELETE" });
            if (response.ok) {
                setStatements((prev) => prev.filter((s) => s.id !== id));
                window.dispatchEvent(new Event("statementDeleted"));
            } else {
                alert("Failed to delete statement");
            }
        } catch (error) {
            console.error("Error deleting statement:", error);
            alert("Error deleting statement");
        } finally {
            setDeletingId(null);
        }
    };

    if (!user) {
        return (
            <Card className="border-dashed border-slate-300 dark:border-slate-700">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Receipt className="mb-4 h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Sign in required</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        Log in to view and load your saved statements.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const statsPanel = (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                        <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums">{statistics.totalStatements}</p>
                        <p className="text-xs text-muted-foreground">Statements</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                        <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums">{statistics.totalInvoices}</p>
                        <p className="text-xs text-muted-foreground">Invoices included</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                        <Wallet className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums truncate">
                            {formatNumberWithCommas(statistics.totalAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total value</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                        <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums">{statistics.uniqueClients}</p>
                        <p className="text-xs text-muted-foreground">Clients</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const filtersPanel = (
        <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
            <CardContent className="space-y-4 p-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Search & filters</p>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search title, billed to, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 pl-9"
                    />
                </div>
                <Select value={sortType} onValueChange={(v) => setSortType(v as SortType)}>
                    <SelectTrigger className="h-10 w-full">
                        <SlidersHorizontal className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date-desc">Newest first</SelectItem>
                        <SelectItem value="date-asc">Oldest first</SelectItem>
                        <SelectItem value="amount-desc">Highest amount</SelectItem>
                        <SelectItem value="amount-asc">Lowest amount</SelectItem>
                        <SelectItem value="invoices-desc">Most invoices</SelectItem>
                        <SelectItem value="invoices-asc">Fewest invoices</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    className="h-10 w-full gap-1.5"
                    onClick={() => setShowAdvancedFilters((v) => !v)}
                >
                    <Filter className="h-3.5 w-3.5" />
                    Advanced filters
                    {showAdvancedFilters ? (
                        <ChevronUp className="ml-auto h-3.5 w-3.5" />
                    ) : (
                        <ChevronDown className="ml-auto h-3.5 w-3.5" />
                    )}
                </Button>
                {showAdvancedFilters && uniqueClients.length > 0 && (
                    <Select value={clientFilter} onValueChange={setClientFilter}>
                        <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Client email" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All clients</SelectItem>
                            {uniqueClients.map((email) => (
                                <SelectItem key={email} value={email}>
                                    {email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" className="h-8 w-full justify-start gap-1 text-xs" onClick={clearFilters}>
                        <X className="h-3 w-3" />
                        Clear filters
                    </Button>
                )}
            </CardContent>
        </Card>
    );

    const statementListContent = loading ? (
        <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    ) : statements.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <Receipt className="mb-4 h-8 w-8 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No saved statements yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Select invoices and create a statement from the saved invoices page.
            </p>
        </div>
    ) : filteredStatements.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <Search className="mb-4 h-8 w-8 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No matches</h3>
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear filters
            </Button>
        </div>
    ) : (
        <div className="h-[calc(100vh-300px)] min-h-[420px] w-full overflow-auto">
            <Table className="min-w-[900px]">
                <TableHeader className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                    <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                        <TableHead className="bg-white dark:bg-slate-900">Statement</TableHead>
                        <TableHead className="bg-white dark:bg-slate-900">Billed to</TableHead>
                        <TableHead className="bg-white dark:bg-slate-900">Client</TableHead>
                        <TableHead className="text-right bg-white dark:bg-slate-900">Invoices</TableHead>
                        <TableHead className="text-right bg-white dark:bg-slate-900">Amount</TableHead>
                        <TableHead className="bg-white dark:bg-slate-900">Updated</TableHead>
                        <TableHead className="text-right w-[220px] bg-white dark:bg-slate-900">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredStatements.map((statement) => {
                        const total = getStatementTotal(statement);
                        const currency = getStatementCurrency(statement);
                        const isDeleting = deletingId === statement.id;
                        return (
                            <TableRow
                                key={statement.id}
                                className="group border-slate-100 dark:border-slate-800"
                            >
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                            <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{statement.title || "STATEMENT"}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {statement.statementDateFrom && statement.statementDateTo
                                                    ? `${statement.statementDateFrom} – ${statement.statementDateTo}`
                                                    : statement.createdAt}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="truncate text-sm max-w-[200px] block">
                                        {statement.billedToName || "—"}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate max-w-[200px]">{statement.clientEmail}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {getStatementInvoiceCount(statement)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <p className="font-semibold tabular-nums">
                                        {formatNumberWithCommas(total)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{currency}</p>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{statement.updatedAt}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            size="sm"
                                            className="h-8 gap-1"
                                            disabled={loadingStatementId === statement.id}
                                            onClick={() => handleLoad(statement)}
                                        >
                                            {loadingStatementId === statement.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Load
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            title="Download PDF"
                                            onClick={() =>
                                                window.open(`/api/statement/${statement.id}/download`, "_blank")
                                            }
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            disabled={isDeleting}
                                            onClick={() => handleDelete(statement.id)}
                                            title="Delete statement"
                                        >
                                            {isDeleting ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch xl:gap-8">
            <aside className="w-full shrink-0 space-y-4 xl:w-[340px] 2xl:w-[380px]">
                {statsPanel}
                {filtersPanel}
            </aside>

            <section className="flex min-h-[520px] min-w-0 flex-1 flex-col xl:min-h-[calc(100vh-220px)]">
                <Card className="flex h-full flex-col overflow-hidden border-slate-200/80 bg-white/95 shadow-md dark:border-slate-800 dark:bg-slate-900/95">
                    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Statements</h2>
                            <p className="text-sm text-muted-foreground">
                                {statements.length} loaded · {filteredCount} total
                            </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 px-3 py-1 text-sm font-normal">
                            {statistics.totalStatements} matching
                        </Badge>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">{statementListContent}</div>
                    {!loading && statements.length > 0 && (
                        <div className="flex shrink-0 justify-center border-t border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/30">
                            {hasMore ? (
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    disabled={loading}
                                    onClick={() =>
                                        fetchStatements(true, clientFilter, statements.length)
                                    }
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>Load more ({statements.length} of {filteredCount})</>
                                    )}
                                </Button>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Showing all {filteredCount} statement
                                    {filteredCount !== 1 ? "s" : ""}
                                </p>
                            )}
                        </div>
                    )}
                </Card>
            </section>

            {previewStatement && (
                <StatementPreviewModal
                    open={previewOpen}
                    onOpenChange={(open) => {
                        setPreviewOpen(open);
                        if (!open) setPreviewStatement(null);
                    }}
                    invoices={previewStatement.invoices ?? []}
                    clientId={previewStatement.clientId}
                    clientEmail={previewStatement.clientEmail}
                    initialBilledToName={previewStatement.billedToName}
                    initialStatementDateFrom={previewStatement.statementDateFrom}
                    initialStatementDateTo={previewStatement.statementDateTo}
                    onSaveSuccess={() => fetchStatements(false, clientFilter, 0)}
                />
            )}
        </div>
    );
};

export default SavedStatementsList;
