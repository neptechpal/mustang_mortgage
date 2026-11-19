import { SITE } from "@/modules/web/config";
import { Container } from "@/modules/web/components/ui/Container";

export function LendersGrid() {
  if (!SITE.lenders || SITE.lenders.length === 0) {
    return null;
  }

  const categorized = SITE.lenders.reduce(
    (acc, lender) => {
      const cat = lender.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(lender);
      return acc;
    },
    {} as Record<string, typeof SITE.lenders>
  );

  return (
    <Container>
      <div className="mw-stack" style={{ ["--mw-stack" as string]: "48px" }}>
        {Object.entries(categorized).map(([category, lenders]) => (
          <div key={category}>
            <h3 className="mw-h4" style={{ marginBottom: 20, color: "var(--gold-600)" }}>
              {category}
            </h3>
            <ul className="mw-lenders-grid">
              {lenders.map((lender) => (
                <li key={lender.name} className="mw-lender-item">
                  {lender.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Container>
  );
}
