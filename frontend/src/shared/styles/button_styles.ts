export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const base_style =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8] disabled:pointer-events-none disabled:opacity-50";

const variant_styles: Record<ButtonVariant, string> = {
    primary: "bg-[#1d4ed8] text-white hover:bg-[#1e40af]",
    danger: "bg-[#c62828] text-white hover:bg-[#ab2424] focus-visible:outline-red-600",
    secondary:
        "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
    ghost: "text-[#1d4ed8] hover:bg-[#eaf0ff]",
};

export function button_styles(
    variant: ButtonVariant = "primary",
    class_name = "",
) {
    return `${base_style} ${variant_styles[variant]} ${class_name}`;
}
