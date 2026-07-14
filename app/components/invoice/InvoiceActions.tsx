"use client";

// ShadCn
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Components
import {
  PdfViewer,
  BaseButton,
  NewInvoiceAlert,
  InvoiceExportModal,
  DownloadSettingsModal,
  DefaultPresetsModal,
} from "@/app/components";

// Navigation
import { Link } from "@/i18n/navigation";

// Contexts
import { useInvoiceContext } from "@/contexts/InvoiceContext";
import { useTranslationContext } from "@/contexts/TranslationContext";
import { useAuth } from "@/contexts/AuthContext";

// Icons
import { FileInput, FolderUp, Import, Plus, Receipt, RotateCcw, Settings } from "lucide-react";

const InvoiceActions = () => {
  const { invoicePdfLoading, newInvoice } = useInvoiceContext();
  const { user } = useAuth();

  const { _t } = useTranslationContext();
  return (
    <div className={`xl:w-[55%]`}>
      <Card className="h-auto sticky top-0 px-2">
        <CardHeader>
          <CardTitle>{_t("actions.title")}</CardTitle>
          <CardDescription>{_t("actions.description")}</CardDescription>
        </CardHeader>

        <div className="flex flex-col flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-3">
            {/* Load invoice page */}
            <Link href="/invoices">
              <BaseButton
                variant="outline"
                tooltipLabel="Open saved invoices"
                disabled={invoicePdfLoading}
              >
                <FolderUp />
                {_t("actions.loadInvoice")}
              </BaseButton>
            </Link>

            {user && (
              <Link href="/statements">
                <BaseButton
                  variant="outline"
                  tooltipLabel="Open saved statements"
                  disabled={invoicePdfLoading}
                >
                  <Receipt />
                  {_t("actions.loadStatement")}
                </BaseButton>
              </Link>
            )}

            {/* Export modal button */}
            <InvoiceExportModal>
              <BaseButton
                variant="outline"
                tooltipLabel="Open load invoice menu"
                disabled={invoicePdfLoading}
              >
                <Import />
                {_t("actions.exportInvoice")}
              </BaseButton>
            </InvoiceExportModal>

            {/* Download settings button */}
            <DownloadSettingsModal>
              <BaseButton
                variant="outline"
                tooltipLabel="Configure download location"
                disabled={invoicePdfLoading}
              >
                <Settings />
                Download Settings
              </BaseButton>
            </DownloadSettingsModal>

            {/* Manage presets button - only show if user is logged in */}
            {user && <DefaultPresetsModal />}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* New invoice button */}
            <NewInvoiceAlert>
              <BaseButton
                variant="outline"
                tooltipLabel="Get a new invoice form"
                disabled={invoicePdfLoading}
              >
                <Plus />
                {_t("actions.newInvoice")}
              </BaseButton>
            </NewInvoiceAlert>

            {/* Reset form button */}
            <NewInvoiceAlert
              title="Reset form?"
              description="This will clear all fields and the saved draft."
              confirmLabel="Reset"
              onConfirm={newInvoice}
            >
              <BaseButton
                variant="destructive"
                tooltipLabel="Reset entire form"
                disabled={invoicePdfLoading}
              >
                <RotateCcw />
                Reset Form
              </BaseButton>
            </NewInvoiceAlert>

            {/* Generate pdf button */}
            <BaseButton
              type="submit"
              tooltipLabel="Generate your invoice"
              loading={invoicePdfLoading}
              loadingText="Generating your invoice"
            >
              <FileInput />
              {_t("actions.generatePdf")}
            </BaseButton>
          </div>

          <div className="w-full">
            {/* Live preview and Final pdf */}
            <PdfViewer />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InvoiceActions;
