"use client";

// Components
import {
    CurrencySelector,
    DatePickerFormField,
    FormInput,
    Subheading,
} from "@/app/components";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

// Variables
import { DEFAULT_INVOICE_LOGO } from "@/lib/variables";

const InvoiceDetails = () => {
    const { _t } = useTranslationContext();

    return (
        <section className="flex flex-col flex-wrap gap-5">
            <Subheading>{_t("form.steps.invoiceDetails.heading")}:</Subheading>

            <div className="flex flex-row flex-wrap gap-5">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium">
                            {_t("form.steps.invoiceDetails.invoiceLogo.label")}:
                        </p>
                        <img
                            src={DEFAULT_INVOICE_LOGO}
                            alt="Company logo"
                            style={{
                                objectFit: "contain",
                                width: "10rem",
                                height: "7rem",
                            }}
                        />
                    </div>

                    <FormInput
                        name="details.invoiceNumber"
                        label={_t("form.steps.invoiceDetails.invoiceNumber")}
                        placeholder="Invoice number"
                    />

                    <DatePickerFormField
                        name="details.invoiceDate"
                        label={_t("form.steps.invoiceDetails.issuedDate")}
                    />

                    <CurrencySelector
                        name="details.currency"
                        label={_t("form.steps.invoiceDetails.currency")}
                        placeholder="Select Currency"
                    />
                </div>
            </div>
        </section>
    );
};

export default InvoiceDetails;
