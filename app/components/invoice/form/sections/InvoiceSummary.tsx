"use client";

// RHF
import { useFormContext } from "react-hook-form";

// ShadCn
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Components
import {
    Charges,
    FormTextarea,
    Subheading,
} from "@/app/components";
import DocumentsSection from "./DocumentsSection";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

// Variables
import { DEFAULT_INVOICE_SIGNATURE } from "@/lib/variables";

// Types
import { InvoiceType } from "@/types";

const InvoiceSummary = () => {
    const { _t } = useTranslationContext();
    const { watch, setValue } = useFormContext<InvoiceType>();
    const showReceiverSignatureSection = watch("details.showReceiverSignatureSection") ?? false;

    return (
        <section>
            <Subheading>{_t("form.steps.summary.heading")}:</Subheading>
            <div className="flex flex-wrap gap-x-5 gap-y-10">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium">Signature:</p>
                        <img
                            src={DEFAULT_INVOICE_SIGNATURE}
                            alt="Authorized signature"
                            style={{
                                objectFit: "contain",
                                maxWidth: "12rem",
                                maxHeight: "5rem",
                            }}
                        />
                    </div>

                    {/* Additional notes & Payment terms */}
                    <FormTextarea
                        name="details.additionalNotes"
                        label={_t("form.steps.summary.additionalNotes")}
                        placeholder="Your additional notes"
                    />
                    <FormTextarea
                        name="details.paymentTerms"
                        label={_t("form.steps.summary.paymentTerms")}
                        placeholder="Ex: Net 30"
                    />

                    {/* Receiver Signature Section Toggle */}
                    <div className="flex items-center gap-3 pt-2">
                        <Switch
                            id="showReceiverSignatureSection"
                            checked={showReceiverSignatureSection}
                            onCheckedChange={(checked) => {
                                setValue("details.showReceiverSignatureSection", checked);
                            }}
                        />
                        <Label 
                            htmlFor="showReceiverSignatureSection" 
                            className="text-sm font-medium cursor-pointer"
                        >
                            {_t("form.steps.summary.showReceiverSignatureSection")}
                        </Label>
                    </div>
                </div>

                {/* Final charges */}
                <Charges />
            </div>

            {/* Documents section */}
            <DocumentsSection />
        </section>
    );
};

export default InvoiceSummary;
