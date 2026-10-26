import Link from "next/link";
import { AU_STATES, type AuState } from "@/modules/calc/types";
import { RULES } from "@/modules/calc/rules";
import "../styles/calc.css";
import { dutyPath } from "./paths";

export { dutyPath };

/** Eight-state index (state code in display type + full name). */
export function StatePicker({ current, label = "Stamp duty by state" }: { current?: AuState; label?: string }) {
  return (
    <nav aria-label={label}>
      <ul className="mw-statepicker">
        {AU_STATES.map((s) => (
          <li key={s}>
            <Link href={dutyPath(s)} aria-current={s === current ? "page" : undefined}>
              <span className="mw-statepicker__code">{s}</span>
              <span className="mw-statepicker__name">{RULES[s].name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
