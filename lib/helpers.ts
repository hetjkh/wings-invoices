// Next
import { NextResponse } from "next/server";

// Utils
import numberToWords from "number-to-words";

// Currencies
import currenciesDetails from "@/public/assets/data/currencies.json";
import { CurrencyDetails } from "@/types";

// Variables
import { LOCAL_STORAGE_LAST_INVOICE_NUMBER_KEY } from "@/lib/variables";

/**
 * Formats a number with commas and decimal places
 *
 * @param {number} number - Number to format
 * @returns {string} A styled number to be displayed on the invoice
 */
const formatNumberWithCommas = (number: number) => {
    return number.toLocaleString("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * Formats a number with commas but without decimal places
 *
 * @param {number} number - Number to format
 * @returns {string} A styled number without decimals to be displayed on the invoice
 */
const formatNumberWithCommasNoDecimals = (number: number) => {
    return Math.round(number).toLocaleString("en-US", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

/**
 * @param {string} currency - The currency that is currently selected 
 * @returns {Object} - An object containing the currency details as
 * ```
 * {
    "currency": "United Arab Emirates Dirham",
    "decimals": 2,
    "beforeDecimal": "Dirham",
    "afterDecimal": "Fils"
 }
 */
 const fetchCurrencyDetails = (currency: string): CurrencyDetails | null => {
    const data = currenciesDetails as Record<string, CurrencyDetails>;
    const currencyDetails = data[currency];
    return currencyDetails || null;
};


/**
 * Turns a number into words for invoices
 *
 * @param {number} price - Number to format
 * @returns {string} Number in words
 */
const formatPriceToString = (price: number, currency: string): string => {
    // Initialize variables
    let decimals : number;
    let beforeDecimal: string | null = null;
    let afterDecimal: string | null = null;
    
    const currencyDetails = fetchCurrencyDetails(currency);

    // If currencyDetails is available, use its values, else dynamically set decimals
    if (currencyDetails) {
        decimals = currencyDetails.decimals;
        beforeDecimal = currencyDetails.beforeDecimal;
        afterDecimal = currencyDetails.afterDecimal;
    } else {
        // Dynamically get decimals from the price if currencyDetails is null
        const priceString = price.toString();
        const decimalIndex = priceString.indexOf('.');
        decimals = decimalIndex !== -1 ? priceString.split('.')[1].length : 0;
    }

    // Ensure the price is rounded to the appropriate decimal places
    const roundedPrice = parseFloat(price.toFixed(decimals));

    // Split the price into integer and fractional parts
    const integerPart = Math.floor(roundedPrice);
    
    const fractionalMultiplier = Math.pow(10, decimals);
    const fractionalPart = Math.round((roundedPrice - integerPart) * fractionalMultiplier);

    // Convert the integer part to words with a capitalized first letter
    const integerPartInWords = numberToWords
        .toWords(integerPart)
        .replace(/^\w/, (c) => c.toUpperCase());

    // Convert fractional part to words
    const fractionalPartInWords =
        fractionalPart > 0
            ? numberToWords.toWords(fractionalPart)
            : null;

    // Handle zero values for both parts
    if (integerPart === 0 && fractionalPart === 0) {
        return "Zero";
    }

    // Combine the parts into the final string
    let result = integerPartInWords;

    // Check if beforeDecimal is not null 
    if (beforeDecimal !== null) {
        result += ` ${beforeDecimal}`;
    }

    if (fractionalPartInWords) {
        // Check if afterDecimal is not null
        if (afterDecimal !== null) {
            // Concatenate the after decimal and fractional part
            result += ` and ${fractionalPartInWords} ${afterDecimal}`;
        } else {
            // If afterDecimal is null, concatenate the fractional part
            result += ` point ${fractionalPartInWords}`;
        }
    }

    return result;
};

/**
 * This method flattens a nested object. It is used for xlsx export
 *
 * @param {Record<string, T>} obj - A nested object to flatten
 * @param {string} parentKey - The parent key
 * @returns {Record<string, T>} A flattened object
 */
const flattenObject = <T>(
    obj: Record<string, T>,
    parentKey = ""
): Record<string, T> => {
    const result: Record<string, T> = {};

    for (const key in obj) {
        if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
            const flattened = flattenObject(
                obj[key] as Record<string, T>,
                parentKey + key + "_"
            );
            for (const subKey in flattened) {
                result[parentKey + subKey] = flattened[subKey];
            }
        } else {
            result[parentKey + key] = obj[key];
        }
    }

    return result;
};

/**
 * A method to validate an email address
 *
 * @param {string} email - Email to validate
 * @returns {boolean} A boolean indicating if the email is valid
 */
const isValidEmail = (email: string) => {
    // Regular expression for a simple email pattern
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
};

/**
 * A method to check if a string is a data URL
 *
 * @param {string} str - String to check
 * @returns {boolean} Boolean indicating if the string is a data URL
 */
const isDataUrl = (str: string) => str.startsWith("data:");

/**
 * A method to check if a string is an image URL (data URL or HTTP/HTTPS URL)
 *
 * @param {string} str - String to check
 * @returns {boolean} Boolean indicating if the string is an image URL
 */
const isImageUrl = (str: string) => {
    if (!str) return false;
    // Check if it's a data URL
    if (str.startsWith("data:")) return true;
    // Check if it's an HTTP/HTTPS URL (likely an image)
    if (str.startsWith("http://") || str.startsWith("https://")) {
        // Check for common image extensions
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
        const lowerStr = str.toLowerCase();
        return imageExtensions.some(ext => lowerStr.includes(ext));
    }
    return false;
};

/**
 * Parses a numeric value from an invoice number string.
 * Supports plain numbers ("12") and trailing digits ("INV00012").
 */
const parseInvoiceNumberValue = (invoiceNumber: string | undefined | null): number | null => {
    if (!invoiceNumber || typeof invoiceNumber !== "string") return null;
    const trimmed = invoiceNumber.trim();
    if (!trimmed) return null;

    const asInt = parseInt(trimmed, 10);
    if (!Number.isNaN(asInt) && String(asInt) === trimmed) {
        return asInt;
    }

    const trailingDigits = trimmed.match(/(\d+)$/);
    if (trailingDigits) {
        const value = parseInt(trailingDigits[1], 10);
        return Number.isNaN(value) ? null : value;
    }

    return null;
};

/**
 * Returns the highest numeric invoice number from a list of invoice number strings.
 */
const getMaxInvoiceNumberValue = (invoiceNumbers: Array<string | undefined | null>): number => {
    let max = 0;
    for (const invoiceNumber of invoiceNumbers) {
        const value = parseInvoiceNumberValue(invoiceNumber);
        if (value !== null && value > max) {
            max = value;
        }
    }
    return max;
};

/**
 * Reads the last used invoice number from localStorage (0 if none).
 */
const getLastInvoiceNumberValue = (): number => {
    if (typeof window === "undefined") return 0;

    try {
        const lastNumberStr = window.localStorage.getItem(LOCAL_STORAGE_LAST_INVOICE_NUMBER_KEY);
        if (!lastNumberStr) return 0;
        const lastNumber = parseInt(lastNumberStr, 10);
        return Number.isNaN(lastNumber) ? 0 : lastNumber;
    } catch {
        return 0;
    }
};

/**
 * Updates the last used invoice number if the provided value is higher.
 */
const updateLastInvoiceNumber = (invoiceNumber: string | number): void => {
    if (typeof window === "undefined") return;

    try {
        const value =
            typeof invoiceNumber === "number"
                ? invoiceNumber
                : parseInvoiceNumberValue(invoiceNumber);

        if (value === null || value <= 0) return;

        const current = getLastInvoiceNumberValue();
        if (value > current) {
            window.localStorage.setItem(
                LOCAL_STORAGE_LAST_INVOICE_NUMBER_KEY,
                value.toString()
            );
        }
    } catch {
        // Ignore localStorage errors
    }
};

/**
 * Syncs the last invoice number counter from a list of known invoice numbers.
 */
const syncLastInvoiceNumberFromList = (
    invoiceNumbers: Array<string | undefined | null>
): void => {
    const max = getMaxInvoiceNumberValue(invoiceNumbers);
    if (max > 0) {
        updateLastInvoiceNumber(max);
    }
};

/**
 * Gets the current (last used) invoice number without incrementing.
 * @returns {string} The current invoice number as a string (returns "1" if none exists)
 */
const getCurrentInvoiceNumber = (): string => {
    const lastNumber = getLastInvoiceNumberValue();
    return lastNumber > 0 ? lastNumber.toString() : "1";
};

/**
 * Peeks the next invoice number without writing to localStorage.
 * Use this when filling a new invoice form; commit on successful save.
 */
const peekNextInvoiceNumber = (): string => {
    const lastNumber = getLastInvoiceNumberValue();
    return (lastNumber + 1).toString();
};

/**
 * Gets the next invoice number for a new invoice form.
 * Does not advance the counter until the invoice is saved (via updateLastInvoiceNumber).
 * @returns {string} The next invoice number as a string
 */
const getNextInvoiceNumber = (): string => {
    return peekNextInvoiceNumber();
};

/**
 * Dynamically imports and retrieves an invoice template React component based on the provided template ID.
 *
 * @param {number} templateId - The ID of the invoice template.
 * @returns {Promise<React.ComponentType<any> | null>} A promise that resolves to the invoice template component or null if not found.
 * @throws {Error} Throws an error if there is an issue with the dynamic import or if a default template is not available.
 */
const getInvoiceTemplate = async (templateId: number) => {
    // Dynamic template component name
    const componentName = `InvoiceTemplate${templateId}`;

    try {
        const module = await import(
            `@/app/components/templates/invoice-pdf/${componentName}`
        );
        return module.default;
    } catch (err) {
        console.error(`Error importing template ${componentName}: ${err}`);

        // Provide a default template
        return null;
    }
};

/**
 * Convert a file to a buffer. Used for sending invoice as email attachment.
 * @param {File} file - The file to convert to a buffer.
 * @returns {Promise<Buffer>} A promise that resolves to a buffer.
 */
const fileToBuffer = async (file: File) => {
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await new NextResponse(file).arrayBuffer();

    // Convert ArrayBuffer to Buffer
    const pdfBuffer = Buffer.from(arrayBuffer);

    return pdfBuffer;
};

const parseInvoiceDate = (dateValue: Date | string | undefined | null): Date => {
    if (!dateValue) {
        return new Date();
    }

    if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) {
            return new Date();
        }
        return dateValue;
    }

    if (typeof dateValue === "string") {
        if (dateValue.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
            const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                const year = parseInt(isoMatch[1], 10);
                const month = parseInt(isoMatch[2], 10) - 1;
                const day = parseInt(isoMatch[3], 10);
                return new Date(Date.UTC(year, month, day));
            }
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return new Date(
                    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
                );
            }
        } else {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }

    return new Date();
};

const formatStatementDate = (dateValue: Date | string | undefined | null): string => {
    const date = parseInvoiceDate(dateValue);

    const day = date.getUTCDate();
    const monthIndex = date.getUTCMonth();
    const year = date.getUTCFullYear().toString().slice(-2);

    const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = monthNames[monthIndex];

    return `${day}-${month}-${year}`;
};

const formatInvoiceDate = (
    dateValue: Date | string | undefined | null,
    options?: Intl.DateTimeFormatOptions
): string => {
    if (!dateValue) {
        return "-";
    }

    let date: Date;
    let useLocalComponents = false;

    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        date = dateValue;
        useLocalComponents = true;
    } else {
        date = parseInvoiceDate(dateValue);
        useLocalComponents = false;
    }

    const year = useLocalComponents ? date.getFullYear() : date.getUTCFullYear();
    const month = useLocalComponents ? date.getMonth() : date.getUTCMonth();
    const day = useLocalComponents ? date.getDate() : date.getUTCDate();

    const localDate = new Date(year, month, day);

    const formatOptions = options || {
        year: "numeric",
        month: "long",
        day: "numeric",
    };

    return localDate.toLocaleDateString("en-US", formatOptions);
};

export {
    formatNumberWithCommas,
    formatNumberWithCommasNoDecimals,
    formatPriceToString,
    flattenObject,
    isValidEmail,
    isDataUrl,
    isImageUrl,
    parseInvoiceNumberValue,
    getMaxInvoiceNumberValue,
    updateLastInvoiceNumber,
    syncLastInvoiceNumberFromList,
    getCurrentInvoiceNumber,
    peekNextInvoiceNumber,
    getNextInvoiceNumber,
    getInvoiceTemplate,
    fileToBuffer,
    parseInvoiceDate,
    formatStatementDate,
    formatInvoiceDate,
};
