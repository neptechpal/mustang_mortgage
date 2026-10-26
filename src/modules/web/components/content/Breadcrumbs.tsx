import Link from "next/link";
import { JsonLd, breadcrumbJsonLd, type Crumb } from "../../seo";

/**
 * Breadcrumb trail + BreadcrumbList JSON-LD. "Home" is added automatically.
 * <Breadcrumbs items={[{ name: "About", path: "/about" }, { name: "Sulav Adhikari", path: "/about/sulav-adhikari" }]} />
 * The last item is the current page.
 */
export function Breadcrumbs({ items, jsonLd = true }: { items: Crumb[]; jsonLd?: boolean }) {
  const all: Crumb[] = [{ name: "Home", path: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="mw-crumbs">
      <ol>
        {all.map((c, i) => (
          <li key={c.path}>{i === all.length - 1 ? <span aria-current="page">{c.name}</span> : <Link href={c.path}>{c.name}</Link>}</li>
        ))}
      </ol>
      {jsonLd && <JsonLd data={breadcrumbJsonLd(all)} />}
    </nav>
  );
}
