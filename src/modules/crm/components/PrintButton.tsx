"use client";
import { useEffect } from "react";
import { Printer } from "lucide-react";
import { buttonStyles } from "@/components/admin/ui";
export default function PrintButton({ auto = true }: { auto?: boolean }) {
  useEffect(() => { if (auto) setTimeout(() => window.print(), 400); }, [auto]);
  return <button type="button" onClick={() => window.print()} className={buttonStyles({ variant: "primary" })}><Printer />Print / Save as PDF</button>;
}
