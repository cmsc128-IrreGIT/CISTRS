export type ButtonVariant = "primary" | "secondary" | "ghost";

const base_style =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:pointer-events-none disabled:opacity-50";

const variant_styles: Record<ButtonVariant, string> = {
    primary: "bg-red-600 text-white hover:bg-red-700",
    secondary:
        "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
    ghost: "text-red-700 hover:bg-red-50",
};

export function button_styles(
    variant: ButtonVariant = "primary",
    class_name = "",
) {
    return `${base_style} ${variant_styles[variant]} ${class_name}`;
}
