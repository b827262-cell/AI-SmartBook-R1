import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      style={{
        borderRadius: 12,
        padding: "10px 16px",
        border: "1px solid #d1d5db",
        background: "#111827",
        color: "white",
        cursor: "pointer",
        ...(props.style || {})
      }}
    />
  );
}
