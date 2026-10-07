import { LoaderCircle } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { button_styles } from "../../styles/button_styles";
import type { ButtonVariant } from "../../styles/button_styles";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
    variant?: ButtonVariant;
    is_loading?: boolean;
};

export default function Button({
    children,
    variant = "primary",
    is_loading = false,
    disabled = false,
    type = "button",
    className = "",
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            type={type}
            disabled={disabled || is_loading}
            aria-busy={is_loading}
            className={button_styles(variant, className)}
        >
            {is_loading && (
                <LoaderCircle
                    size={18}
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                />
            )}
            {children}
        </button>
    );
}
