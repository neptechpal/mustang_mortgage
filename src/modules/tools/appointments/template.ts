// Minimal Twig subset used by SSA notification templates:
//   {{ path.to.value }}, {{ value|raw }}, {% if x %}…{% else %}…{% endif %} (nestable).
// Context values are expected to be HTML-safe already (escape user input before passing).

type Ctx = Record<string, unknown>;

function lookup(ctx: Ctx, path: string): unknown {
  let cur: unknown = ctx;
  for (const k of path.split(".")) {
    if (cur && typeof cur === "object" && k in (cur as Ctx)) cur = (cur as Ctx)[k];
    else return undefined;
  }
  return cur;
}

const truthy = (v: unknown) => !(v === undefined || v === null || v === "" || v === false || v === 0 || (Array.isArray(v) && !v.length));

export function renderTemplate(tpl: string, ctx: Ctx): string {
  let s = tpl;
  // Resolve innermost if-blocks first.
  const re = /\{%-?\s*if\s+([\w.]+)\s*-?%\}((?:(?!\{%-?\s*if\s)[\s\S])*?)\{%-?\s*endif\s*-?%\}/;
  for (let guard = 0; guard < 200 && re.test(s); guard++) {
    s = s.replace(re, (_m, cond: string, body: string) => {
      const [yes, no = ""] = body.split(/\{%-?\s*else\s*-?%\}/);
      return truthy(lookup(ctx, cond)) ? yes : no;
    });
  }
  return s.replace(/\{\{\s*([\w.]+)\s*(?:\|\s*\w+\s*)*\}\}/g, (_m, path: string) => {
    const v = lookup(ctx, path);
    return v === undefined || v === null ? "" : String(v);
  });
}
