"use client";

import { ArrowLeft, Receipt } from "lucide-react";
import { Link } from "@/i18n/navigation";

import SavedStatementsList from "@/app/components/invoice/SavedStatementsList";
import { Button } from "@/components/ui/button";

const SavedStatementsPage = () => {
    return (
        <div className="min-h-[calc(100vh-4rem)] w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
                <header className="mb-8">
                    <Link
                        href="/"
                        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to invoice form
                    </Link>

                    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                                <Receipt className="h-3.5 w-3.5" />
                                Statement library
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                                Saved Statements
                            </h1>
                            <p className="max-w-xl text-base text-muted-foreground">
                                Browse saved statements, load them for preview or download, and manage your client
                                billing history.
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <Button asChild variant="outline" className="shadow-sm">
                                <Link href="/invoices">View invoices</Link>
                            </Button>
                            <Button asChild variant="default" className="shadow-sm">
                                <Link href="/">New invoice</Link>
                            </Button>
                        </div>
                    </div>
                </header>

                <SavedStatementsList />
            </div>
        </div>
    );
};

export default SavedStatementsPage;
