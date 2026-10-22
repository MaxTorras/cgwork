import type { ReactNode } from "react";

export const instant = false;

export default function EditFormLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}