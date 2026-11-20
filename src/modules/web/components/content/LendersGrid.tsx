import { groupLenders, type Lender } from "../../lenders";
import "../../styles/proof.css";

export function LendersGrid({ lenders }: { lenders: Lender[] }) {
  if (!lenders.length) return null;
  return (
    <div>
      <div className="mw-lenders">
        {groupLenders(lenders).map((g) => (
          <div key={g.category}>
            <h3 className="mw-lenders__cat">{g.category}</h3>
            <ul className="mw-lenders__list">
              {g.items.map((l) => (
                <li key={l.name}>{l.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mw-small" style={{ marginTop: 24, maxWidth: "62ch" }}>
        Not every lender in Australia is on our panel, and which lenders suit you depends on your circumstances. Lender names are trademarks of their owners.
      </p>
    </div>
  );
}
