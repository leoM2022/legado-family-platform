"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"button">, "type"> & { pendingLabel: string };

export default function SubmitButton({ children, disabled, pendingLabel, ...props }: Props) {
    const { pending } = useFormStatus();
    return (
        <button {...props} type="submit" disabled={pending || disabled} aria-busy={pending}>
            {pending ? pendingLabel : children}
        </button>
    );
}
