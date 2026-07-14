"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";

// RHF
import { useFormContext } from "react-hook-form";

// ShadCn
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Components
import StatementPreviewModal from "@/app/components/modals/invoice/StatementPreviewModal";

// Contexts
import { useInvoiceContext } from "@/contexts/InvoiceContext";
import { useAuth } from "@/contexts/AuthContext";

// Helpers
import { formatNumberWithCommas, parseInvoiceDate as parseInvoiceDateHelper, formatInvoiceDate } from "@/lib/helpers";

// Variables
import { DATE_OPTIONS, SHORT_DATE_OPTIONS, FORM_DEFAULT_VALUES } from "@/lib/variables";

// Types
import { InvoiceType } from "@/types";

// Icons
import {
    ArrowRight,
    Building2,
    CalendarIcon,
    CheckSquare,
    ChevronDown,
    ChevronUp,
    FileInput,
    FileText,
    Filter,
    Loader2,
    Receipt,
    Search,
    SlidersHorizontal,
    Trash2,
    User,
    Wallet,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

type SavedInvoicesListProps = {
    onInvoiceLoaded?: () => void;
};

type FilterType = "all" | "sender" | "receiver";
type SortType = 
    | "date-desc" 
    | "date-asc" 
    | "month-desc" 
    | "month-asc" 
    | "year-desc" 
    | "year-asc"
    | "amount-desc"
    | "amount-asc"
    | "invoice-number"
    | "sender-name"
    | "receiver-name";

type GroupByType = "none" | "date" | "month" | "year" | "sender" | "receiver" | "currency";

const SavedInvoicesList = ({ onInvoiceLoaded }: SavedInvoicesListProps) => {
    const { user } = useAuth();
    const { 
        savedInvoices, 
        onFormSubmit, 
        deleteInvoice, 
        hasMoreInvoices, 
        loadingInvoices, 
        totalInvoiceCount,
        filteredInvoiceCount,
        invoiceListStats,
        reloadInvoiceList,
        loadMoreInvoices,
    } = useInvoiceContext();
    const skipFilterReloadRef = useRef(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [sortType, setSortType] = useState<SortType>("date-desc");
    const [groupBy, setGroupBy] = useState<GroupByType>("none");
    const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
    const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
    const [amountMin, setAmountMin] = useState<string>("");
    const [amountMax, setAmountMax] = useState<string>("");
    const [selectedCurrency, setSelectedCurrency] = useState<string>("all");
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set());
    const [showStatementPreview, setShowStatementPreview] = useState(false);
    const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | number | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const { reset } = useFormContext<InvoiceType>();

    // TODO: Remove "any" from the function below
    // Update fields when selected invoice is changed.
    // ? Reason: The fields don't go through validation when invoice loads
    const updateFields = (selected: any) => {
        // Migrate phone from string to array for backward compatibility
        if (selected?.sender?.phone && typeof selected.sender.phone === "string") {
            selected.sender.phone = selected.sender.phone ? [selected.sender.phone] : [""];
        } else if (!selected?.sender?.phone || !Array.isArray(selected.sender.phone)) {
            selected.sender.phone = [""];
        }
        if (selected?.receiver?.phone && typeof selected.receiver.phone === "string") {
            selected.receiver.phone = selected.receiver.phone ? [selected.receiver.phone] : [""];
        } else if (!selected?.receiver?.phone || !Array.isArray(selected.receiver.phone)) {
            selected.receiver.phone = [""];
        }
        // Remove database-specific fields
        if (selected.id) {
            delete selected.id;
        }
        if (selected._id) {
            delete selected._id;
        }
        if (selected.userId) {
            delete selected.userId;
        }
        if (selected.createdAt) {
            delete selected.createdAt;
        }

        // Next 2 lines are so that when invoice loads,
        // the dates won't be in the wrong format
        // ? Selected cannot be of type InvoiceType because of these 2 variables
        if (selected.details.dueDate) {
            selected.details.dueDate = new Date(selected.details.dueDate);
        }
        if (selected.details.invoiceDate) {
            selected.details.invoiceDate = new Date(selected.details.invoiceDate);
        }

        selected.details.invoiceLogo = FORM_DEFAULT_VALUES.details.invoiceLogo;
        selected.details.signature = FORM_DEFAULT_VALUES.details.signature;
    };

    /**
     * Loads a given invoice into the form.
     *
     * @param {InvoiceType} selectedInvoice - The selected invoice
     * @param {number} originalIdx - The original index of the invoice
     */
    const load = async (selectedInvoice: InvoiceType, originalIdx: number) => {
        if (selectedInvoice) {
            // Set loading state
            const invoiceId = (selectedInvoice as any).id || (selectedInvoice as any)._id || originalIdx;
            setLoadingInvoiceId(invoiceId);
            
            try {
                // Use setTimeout to allow UI to update before heavy operation
                await new Promise(resolve => setTimeout(resolve, 0));
                
                // Create a deep copy to avoid mutating the original
                const invoiceCopy = JSON.parse(JSON.stringify(selectedInvoice));
                
                // Update fields on the copy (this handles date conversion and other transformations)
                updateFields(invoiceCopy);
                
                // Reset form with the prepared copy
                // Note: Dates are already converted to Date objects by updateFields
                reset(invoiceCopy);
            } finally {
                setLoadingInvoiceId(null);
            }
        }
    };

    /**
     * Loads a given invoice into the form and generates a pdf by submitting the form.
     *
     * @param {InvoiceType} selectedInvoice - The selected invoice
     * @param {number} originalIdx - The original index of the invoice
     */
    const handleLoad = async (selectedInvoice: InvoiceType, originalIdx: number) => {
        await load(selectedInvoice, originalIdx);
        onInvoiceLoaded?.();
    };

    const loadAndGeneratePdf = async (selectedInvoice: InvoiceType, originalIdx: number) => {
        await load(selectedInvoice, originalIdx);
        onFormSubmit(selectedInvoice);
        onInvoiceLoaded?.();
    };

    // Get unique sender and receiver names for filter dropdown
    const uniqueSenders = useMemo(() => {
        const senders = new Set<string>();
        savedInvoices.forEach((invoice) => {
            if (invoice.sender.name) {
                senders.add(invoice.sender.name);
            }
        });
        return Array.from(senders).sort();
    }, [savedInvoices]);

    const uniqueReceivers = useMemo(() => {
        const receivers = new Set<string>();
        savedInvoices.forEach((invoice) => {
            if (invoice.receiver.name) {
                receivers.add(invoice.receiver.name);
            }
        });
        return Array.from(receivers).sort();
    }, [savedInvoices]);

    const uniqueCurrencies = useMemo(() => {
        const currencies = new Set<string>();
        savedInvoices.forEach((invoice) => {
            if (invoice.details.currency) {
                currencies.add(invoice.details.currency);
            }
        });
        return Array.from(currencies).sort();
    }, [savedInvoices]);

    // Helper function to parse invoice date - uses UTC-aware parsing from helpers
    const parseInvoiceDate = (invoice: InvoiceType): Date => {
        if (invoice.details.invoiceDate) {
            return parseInvoiceDateHelper(invoice.details.invoiceDate);
        }
        return new Date(0);
    };

    // Helper function to get month from date - uses UTC methods to avoid timezone issues
    const getMonthKey = (date: Date): string => {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    };

    // Helper function to get year from date - uses UTC methods to avoid timezone issues
    const getYearKey = (date: Date): string => {
        return String(date.getUTCFullYear());
    };

    // Server-side search/filters for logged-in users; client-side for localStorage
    useEffect(() => {
        if (!user) return;
        if (skipFilterReloadRef.current) {
            skipFilterReloadRef.current = false;
            return;
        }
        const timer = setTimeout(() => {
            reloadInvoiceList({
                search: searchQuery.trim() || undefined,
                filterType,
                dateFrom: dateFrom?.toISOString(),
                dateTo: dateTo?.toISOString(),
                amountMin: amountMin || undefined,
                amountMax: amountMax || undefined,
                currency: selectedCurrency,
                sort: sortType,
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [
        user,
        searchQuery,
        filterType,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
        selectedCurrency,
        sortType,
        reloadInvoiceList,
    ]);

    // Filter invoices (client-side only when not using database)
    const filteredInvoices = useMemo(() => {
        let filtered = savedInvoices.map((invoice, idx) => ({ invoice, originalIdx: idx }));

        if (user) {
            return filtered;
        }

        // Apply filter type (sender/receiver)
        if (filterType === "sender" && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(({ invoice }) => {
                const senderName = invoice.sender.name?.toLowerCase() || "";
                return senderName.includes(query);
            });
        } else if (filterType === "receiver" && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(({ invoice }) => {
                const receiverName = invoice.receiver.name?.toLowerCase() || "";
                return receiverName.includes(query);
            });
        } else if (searchQuery.trim()) {
            // General search across all fields
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(({ invoice }) => {
                const invoiceNumber = invoice.details.invoiceNumber?.toLowerCase() || "";
                const senderName = invoice.sender.name?.toLowerCase() || "";
                const receiverName = invoice.receiver.name?.toLowerCase() || "";
                
                return (
                    invoiceNumber.includes(query) ||
                    senderName.includes(query) ||
                    receiverName.includes(query)
                );
            });
        }

        // Apply date range filter
        if (dateFrom || dateTo) {
            filtered = filtered.filter(({ invoice }) => {
                const invoiceDate = parseInvoiceDate(invoice);
                if (dateFrom && invoiceDate < dateFrom) return false;
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999); // Include entire day
                    if (invoiceDate > toDate) return false;
                }
                return true;
            });
        }

        // Apply amount range filter
        if (amountMin || amountMax) {
            filtered = filtered.filter(({ invoice }) => {
                const amount = Number(invoice.details.totalAmount) || 0;
                if (amountMin && amount < Number(amountMin)) return false;
                if (amountMax && amount > Number(amountMax)) return false;
                return true;
            });
        }

        // Apply currency filter
        if (selectedCurrency !== "all") {
            filtered = filtered.filter(({ invoice }) => {
                return invoice.details.currency === selectedCurrency;
            });
        }

        return filtered;
    }, [savedInvoices, searchQuery, filterType, dateFrom, dateTo, amountMin, amountMax, selectedCurrency, user]);

    // Sort invoices (client-side only for localStorage; server sorts when logged in)
    const sortedInvoices = useMemo(() => {
        if (user) {
            return filteredInvoices;
        }

        const sorted = [...filteredInvoices];
        
        sorted.sort((a, b) => {
            const invoiceA = a.invoice;
            const invoiceB = b.invoice;

            switch (sortType) {
                case "date-desc":
                    return parseInvoiceDate(invoiceB).getTime() - parseInvoiceDate(invoiceA).getTime();
                case "date-asc":
                    return parseInvoiceDate(invoiceA).getTime() - parseInvoiceDate(invoiceB).getTime();
                case "month-desc":
                    return getMonthKey(parseInvoiceDate(invoiceB)).localeCompare(getMonthKey(parseInvoiceDate(invoiceA)));
                case "month-asc":
                    return getMonthKey(parseInvoiceDate(invoiceA)).localeCompare(getMonthKey(parseInvoiceDate(invoiceB)));
                case "year-desc":
                    return getYearKey(parseInvoiceDate(invoiceB)).localeCompare(getYearKey(parseInvoiceDate(invoiceA)));
                case "year-asc":
                    return getYearKey(parseInvoiceDate(invoiceA)).localeCompare(getYearKey(parseInvoiceDate(invoiceB)));
                case "amount-desc":
                    return (Number(invoiceB.details.totalAmount) || 0) - (Number(invoiceA.details.totalAmount) || 0);
                case "amount-asc":
                    return (Number(invoiceA.details.totalAmount) || 0) - (Number(invoiceB.details.totalAmount) || 0);
                case "invoice-number":
                    return (invoiceA.details.invoiceNumber || "").localeCompare(invoiceB.details.invoiceNumber || "");
                case "sender-name":
                    return (invoiceA.sender.name || "").localeCompare(invoiceB.sender.name || "");
                case "receiver-name":
                    return (invoiceA.receiver.name || "").localeCompare(invoiceB.receiver.name || "");
                default:
                    return 0;
            }
        });

        return sorted;
    }, [filteredInvoices, sortType, user]);

    // Group invoices
    const groupedInvoices = useMemo(() => {
        if (groupBy === "none") {
            return { "All Invoices": sortedInvoices };
        }

        const groups: Record<string, typeof sortedInvoices> = {};
        const groupOrder: Record<string, number> = {}; // For sorting groups

        sortedInvoices.forEach((item) => {
            let key: string;
            let sortKey: number = 0;
            const invoice = item.invoice;
            const date = parseInvoiceDate(invoice);

            switch (groupBy) {
                case "date":
                    key = formatInvoiceDate(invoice.details.invoiceDate, DATE_OPTIONS);
                    sortKey = date.getTime();
                    break;
                case "month":
                    // Format: "January 2024", "February 2024", etc.
                    key = formatInvoiceDate(invoice.details.invoiceDate, { year: "numeric", month: "long" });
                    // Sort key: year * 100 + month (e.g., 202401 for January 2024)
                    sortKey = date.getUTCFullYear() * 100 + date.getUTCMonth() + 1;
                    break;
                case "year":
                    key = getYearKey(date);
                    sortKey = date.getUTCFullYear();
                    break;
                case "sender":
                    key = invoice.sender.name || "Unknown Sender";
                    sortKey = 0;
                    break;
                case "receiver":
                    key = invoice.receiver.name || "Unknown Receiver";
                    sortKey = 0;
                    break;
                case "currency":
                    key = invoice.details.currency || "Unknown Currency";
                    sortKey = 0;
                    break;
                default:
                    key = "All Invoices";
                    sortKey = 0;
            }

            if (!groups[key]) {
                groups[key] = [];
                groupOrder[key] = sortKey;
            }
            groups[key].push(item);
        });

        // Sort groups by their sort key for chronological ordering
        if (groupBy === "month" || groupBy === "year" || groupBy === "date") {
            const sortedGroups: Record<string, typeof sortedInvoices> = {};
            Object.keys(groups)
                .sort((a, b) => {
                    if (groupBy === "month" || groupBy === "year" || groupBy === "date") {
                        return groupOrder[b] - groupOrder[a]; // Descending (newest first)
                    }
                    return a.localeCompare(b);
                })
                .forEach((key) => {
                    sortedGroups[key] = groups[key];
                });
            return sortedGroups;
        }

        return groups;
    }, [sortedInvoices, groupBy]);

    // Stats from server (all matching invoices) or client (localStorage only)
    const statistics = useMemo(() => {
        if (user) {
            return {
                totalInvoices: invoiceListStats.matchingCount,
                totalAmount: invoiceListStats.totalAmount,
                uniqueCurrencies: invoiceListStats.uniqueCurrencies,
            };
        }
        const totalInvoices = filteredInvoices.length;
        const totalAmount = filteredInvoices.reduce((sum, { invoice }) => {
            return sum + (Number(invoice.details.totalAmount) || 0);
        }, 0);
        const currencies = new Set(filteredInvoices.map(({ invoice }) => invoice.details.currency));
        return {
            totalInvoices,
            totalAmount,
            uniqueCurrencies: currencies.size,
        };
    }, [filteredInvoices, user, invoiceListStats]);

    const clearFilters = () => {
        setSearchQuery("");
        setFilterType("all");
        setDateFrom(undefined);
        setDateTo(undefined);
        setAmountMin("");
        setAmountMax("");
        setSelectedCurrency("all");
        if (user) {
            reloadInvoiceList({
                sort: sortType,
                currency: "all",
            });
        }
    };

    const hasActiveFilters =
        !!searchQuery ||
        filterType !== "all" ||
        !!dateFrom ||
        !!dateTo ||
        !!amountMin ||
        !!amountMax ||
        selectedCurrency !== "all";

    const getInvoiceKey = (invoice: InvoiceType, originalIdx: number) =>
        (invoice as { id?: string; _id?: string }).id ||
        (invoice as { id?: string; _id?: string })._id ||
        originalIdx;

    const isInvoiceLoading = (invoice: InvoiceType, originalIdx: number) =>
        loadingInvoiceId === getInvoiceKey(invoice, originalIdx);

    /**
     * Toggle selection of an invoice
     */
    const toggleInvoiceSelection = (originalIdx: number) => {
        setSelectedInvoiceIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(originalIdx)) {
                newSet.delete(originalIdx);
            } else {
                newSet.add(originalIdx);
            }
            return newSet;
        });
    };

    /**
     * Select all visible invoices
     */
    const selectAllInvoices = () => {
        const allIndices = new Set(sortedInvoices.map(({ originalIdx }) => originalIdx));
        setSelectedInvoiceIds(allIndices);
    };

    /**
     * Deselect all invoices
     */
    const deselectAllInvoices = () => {
        setSelectedInvoiceIds(new Set());
    };

    /**
     * Show statement preview for selected invoices
     */
    const showStatementPreviewModal = () => {
        if (selectedInvoiceIds.size === 0) return;
        setShowStatementPreview(true);
    };

    /**
     * Get selected invoices
     */
    const getSelectedInvoices = (): InvoiceType[] => {
        return Array.from(selectedInvoiceIds)
            .map((idx) => savedInvoices[idx])
            .filter(Boolean);
    };

    const renderInvoiceRow = (invoice: InvoiceType, originalIdx: number) => {
        const isSelected = selectedInvoiceIds.has(originalIdx);
        const loading = isInvoiceLoading(invoice, originalIdx);

        return (
            <TableRow
                key={getInvoiceKey(invoice, originalIdx)}
                data-state={isSelected ? "selected" : undefined}
                className={cn(
                    "group border-slate-100 transition-colors dark:border-slate-800",
                    isSelected && "bg-slate-50/80 dark:bg-slate-800/50"
                )}
            >
                <TableCell className="w-10">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleInvoiceSelection(originalIdx)}
                        aria-label={`Select invoice ${invoice.details.invoiceNumber}`}
                    />
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <FileText className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                                #{invoice.details.invoiceNumber || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatInvoiceDate(invoice.details.invoiceDate, DATE_OPTIONS)}
                            </p>
                        </div>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate max-w-[180px] 2xl:max-w-[320px]">{invoice.sender.name || "—"}</span>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate max-w-[180px] 2xl:max-w-[320px]">{invoice.receiver.name || "—"}</span>
                    </div>
                </TableCell>
                <TableCell className="text-right">
                    <p className="font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatNumberWithCommas(Number(invoice.details.totalAmount))}
                    </p>
                    <p className="text-xs text-muted-foreground">{invoice.details.currency}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                    {invoice.details.updatedAt
                        ? new Date(invoice.details.updatedAt).toLocaleDateString("en-US", SHORT_DATE_OPTIONS)
                        : "—"}
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            size="sm"
                            disabled={loading}
                            onClick={() => handleLoad(invoice, originalIdx)}
                            className="h-8 gap-1"
                        >
                            {loading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <>
                                    Load
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={loading}
                            onClick={() => loadAndGeneratePdf(invoice, originalIdx)}
                            title="Load and generate PDF"
                        >
                            <FileInput className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => deleteInvoice(originalIdx)}
                            title="Delete invoice"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    const renderInvoiceGroupBody = (groupKey: string, invoices: typeof sortedInvoices) => (
        <React.Fragment key={groupKey}>
            {groupBy !== "none" && (
                <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/40">
                    <TableCell colSpan={7} className="py-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{groupKey}</h3>
                            <Badge variant="secondary" className="font-normal">
                                {invoices.length}
                            </Badge>
                        </div>
                    </TableCell>
                </TableRow>
            )}
            {invoices.map(({ invoice, originalIdx }) => renderInvoiceRow(invoice, originalIdx))}
        </React.Fragment>
    );

    const invoiceGroups = Object.entries(groupedInvoices);

    const statsPanel = (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            <Card className="border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                            <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold tabular-nums">{statistics.totalInvoices}</p>
                            <p className="text-xs text-muted-foreground">Matching</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
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
                <Card className="border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                            <Filter className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold tabular-nums">{statistics.uniqueCurrencies}</p>
                            <p className="text-xs text-muted-foreground">Currencies</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                            <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold tabular-nums">{savedInvoices.length}</p>
                            <p className="text-xs text-muted-foreground">Loaded</p>
                        </div>
                    </CardContent>
                </Card>
        </div>
    );

    const filtersPanel = (
        <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
            <CardContent className="space-y-4 p-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Search & filters</p>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search invoice #, sender, receiver..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 border-slate-200 bg-slate-50/50 pl-9 dark:border-slate-700 dark:bg-slate-800/50"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                        <SelectTrigger className="h-10 w-full border-slate-200 dark:border-slate-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All fields</SelectItem>
                            <SelectItem value="sender">Sender</SelectItem>
                            <SelectItem value="receiver">Receiver</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortType} onValueChange={(v) => setSortType(v as SortType)}>
                        <SelectTrigger className="h-10 w-full border-slate-200 dark:border-slate-700">
                            <SlidersHorizontal className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date-desc">Newest first</SelectItem>
                            <SelectItem value="date-asc">Oldest first</SelectItem>
                            <SelectItem value="amount-desc">Highest amount</SelectItem>
                            <SelectItem value="amount-asc">Lowest amount</SelectItem>
                            <SelectItem value="invoice-number">Invoice #</SelectItem>
                            <SelectItem value="sender-name">Sender A–Z</SelectItem>
                            <SelectItem value="receiver-name">Receiver A–Z</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByType)}>
                        <SelectTrigger className="h-10 w-full border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder="Group" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No grouping</SelectItem>
                            <SelectItem value="month">By month</SelectItem>
                            <SelectItem value="year">By year</SelectItem>
                            <SelectItem value="sender">By sender</SelectItem>
                            <SelectItem value="receiver">By receiver</SelectItem>
                            <SelectItem value="currency">By currency</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        className="h-10 w-full gap-1.5 border-slate-200 dark:border-slate-700"
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
                </div>

                {showAdvancedFilters && (
                    <div className="space-y-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                        <div className="flex flex-col gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "h-10 flex-1 justify-start font-normal",
                                                !dateFrom && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateFrom ? dateFrom.toLocaleDateString() : "From date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "h-10 flex-1 justify-start font-normal",
                                                !dateTo && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateTo ? dateTo.toLocaleDateString() : "To date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                                    </PopoverContent>
                                </Popover>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                placeholder="Min amount"
                                value={amountMin}
                                onChange={(e) => setAmountMin(e.target.value)}
                                className="h-10"
                            />
                            <Input
                                type="number"
                                placeholder="Max amount"
                                value={amountMax}
                                onChange={(e) => setAmountMax(e.target.value)}
                                className="h-10"
                            />
                        </div>
                        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                            <SelectTrigger className="h-10 w-full">
                                <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All currencies</SelectItem>
                                {uniqueCurrencies.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {(filterType === "sender" && uniqueSenders.length > 0) ||
                (filterType === "receiver" && uniqueReceivers.length > 0) ? (
                    <div className="flex flex-wrap gap-1.5">
                        {(filterType === "sender" ? uniqueSenders : uniqueReceivers).slice(0, 6).map((name) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => setSearchQuery(name)}
                                className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" className="h-8 w-full justify-start gap-1 text-xs" onClick={clearFilters}>
                            <X className="h-3 w-3" />
                            Clear filters
                        </Button>
                    )}
                    {sortedInvoices.length > 0 && selectedInvoiceIds.size < sortedInvoices.length && (
                        <Button variant="ghost" size="sm" className="h-8 w-full justify-start gap-1 text-xs" onClick={selectAllInvoices}>
                            <CheckSquare className="h-3 w-3" />
                            Select all visible
                        </Button>
                    )}
                    {selectedInvoiceIds.size > 0 && (
                        <div className="space-y-2 rounded-lg bg-slate-900 p-3 text-sm text-white dark:bg-slate-100 dark:text-slate-900">
                            <span className="font-medium">{selectedInvoiceIds.size} selected</span>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" className="h-7 flex-1 text-xs" onClick={deselectAllInvoices}>
                                    Clear
                                </Button>
                                <Button size="sm" className="h-7 flex-1 text-xs" onClick={showStatementPreviewModal}>
                                    Statement
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const invoiceListContent = loadingInvoices && savedInvoices.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : savedInvoices.length === 0 && (user ? filteredInvoiceCount === 0 : true) ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No saved invoices yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Create and save invoices from the form, or import a JSON/Excel file.
                </p>
            </div>
        ) : (user ? filteredInvoiceCount === 0 : sortedInvoices.length === 0) ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                    <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No matches</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                    Clear all filters
                </Button>
            </div>
        ) : (
            <div className="h-[calc(100vh-300px)] min-h-[420px] w-full overflow-auto">
                <Table className="min-w-[900px]">
                    <TableHeader className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                        <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                            <TableHead className="w-10 bg-white dark:bg-slate-900" />
                            <TableHead className="bg-white dark:bg-slate-900">Invoice</TableHead>
                            <TableHead className="bg-white dark:bg-slate-900">From</TableHead>
                            <TableHead className="bg-white dark:bg-slate-900">To</TableHead>
                            <TableHead className="text-right bg-white dark:bg-slate-900">Amount</TableHead>
                            <TableHead className="bg-white dark:bg-slate-900">Updated</TableHead>
                            <TableHead className="text-right w-[220px] bg-white dark:bg-slate-900">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoiceGroups.map(([groupKey, invoices]) =>
                            renderInvoiceGroupBody(groupKey, invoices)
                        )}
                    </TableBody>
                </Table>
            </div>
        );

    return (
        <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch xl:gap-8">
            {/* Left: stats + filters */}
            <aside className="w-full shrink-0 space-y-4 xl:w-[340px] 2xl:w-[380px]">
                {statsPanel}
                {filtersPanel}
            </aside>

            {/* Right: dedicated invoice panel with scroll */}
            <section className="flex min-h-[520px] min-w-0 flex-1 flex-col xl:min-h-[calc(100vh-220px)]">
                <Card className="flex h-full flex-col overflow-hidden border-slate-200/80 bg-white/95 shadow-md dark:border-slate-800 dark:bg-slate-900/95">
                    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Invoices</h2>
                            <p className="text-sm text-muted-foreground">
                                {savedInvoices.length} loaded
                                {user
                                    ? ` · ${filteredInvoiceCount} matching · ${totalInvoiceCount} total in account`
                                    : ` · ${sortedInvoices.length} shown`}
                            </p>
                            {user && hasActiveFilters && filteredInvoiceCount > savedInvoices.length && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Search runs across all invoices. Load more to see additional matches.
                                </p>
                            )}
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-sm font-normal px-3 py-1">
                            {statistics.totalInvoices} matching
                        </Badge>
                    </div>

                    <div className="min-h-0 flex-1 overflow-hidden">
                        {invoiceListContent}
                    </div>

                    {(hasMoreInvoices || (!hasMoreInvoices && savedInvoices.length > 0)) &&
                        sortedInvoices.length > 0 && (
                            <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/30">
                                {hasMoreInvoices ? (
                                    <Button
                                        variant="outline"
                                        onClick={loadMoreInvoices}
                                        disabled={loadingInvoices}
                                        className="gap-2"
                                    >
                                        {loadingInvoices ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            <>Load more ({savedInvoices.length} of {user ? filteredInvoiceCount : totalInvoiceCount})</>
                                        )}
                                    </Button>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Showing all {user ? filteredInvoiceCount : totalInvoiceCount} matching
                                        invoice{(user ? filteredInvoiceCount : totalInvoiceCount) !== 1 ? "s" : ""}
                                    </p>
                                )}
                            </div>
                        )}
                </Card>
            </section>

            <StatementPreviewModal
                open={showStatementPreview}
                onOpenChange={(open) => {
                    setShowStatementPreview(open);
                    if (!open) setSelectedInvoiceIds(new Set());
                }}
                invoices={getSelectedInvoices()}
            />
        </div>
    );
};

export default SavedInvoicesList;
