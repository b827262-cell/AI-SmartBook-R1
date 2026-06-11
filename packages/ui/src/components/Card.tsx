import type { HTMLAttributes, ReactNode } from "react";

export function Card(props: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      {...props}
      style={{
        borderRadius: 18,
        border: "1px solid #e5e7eb",
        padding: 20,
        background: "white",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        ...(props.style || {})
      }}
    />
  );
}
