export type TrustItem = { icon: React.ReactNode; children: React.ReactNode };

/** Hairline-separated row of short, verifiable trust statements under a hero. */
export function TrustRow({ items }: { items: TrustItem[] }) {
  return (
    <ul className="mw-trust" style={{ listStyle: "none", padding: 0, marginBottom: 0 }}>
      {items.map((it, i) => (
        <li className="mw-trust__item" key={i}>
          {it.icon}
          <span>{it.children}</span>
        </li>
      ))}
    </ul>
  );
}
