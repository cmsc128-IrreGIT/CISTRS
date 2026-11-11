export const INVENTORY_FORM_INPUT =
    "min-h-10 w-full scroll-mt-20 scroll-mb-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#0b2238] focus-visible:outline-2 focus-visible:outline-[#1d4ed8] aria-invalid:border-red-500 disabled:bg-slate-50 disabled:text-slate-500";

export const INVENTORY_FORM_TEXT = {
    part_name: {
        label: "Item name",
        placeholder: "Enter item name",
        error: "Enter an item name. Spaces alone are not accepted.",
    },
    part_number: {
        label: "Part number",
        placeholder: "Enter part number",
        error: "Enter a part number.",
        help: "Use the unique part number that identifies this item.",
    },
    unit_of_measure: {
        label: "Unit",
        placeholder: "Enter a unit",
        error: "Enter a unit of measure.",
        help: "Use the unit you count this item in, such as pcs, box, or set.",
    },
} as const;

export const INVENTORY_FORM_HELP = {
    opening_quantity: "Enter the starting quantity at the selected location. Use 0 to add the item without stock.",
    minimum_stock: "The item is marked Low stock when its total quantity falls below this number.",
    expiry: "Expiry dates are read-only in this form.",
    serial_number: "Serial numbers are read-only in this form.",
    storage_area: "Storage areas are listed for the selected location.",
} as const;
