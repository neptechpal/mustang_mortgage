#!/usr/bin/env python3
"""
Regenerates the static assets of the public "site" module from the WordPress
backup (run from the app/ folder):

    python3 -I src/modules/site/tools/build_site_assets.py

Outputs
  src/modules/site/styles/elementor.css   combined Elementor / Royal Addons / CF7 CSS
  src/modules/site/styles/fonts/*          Font Awesome 5 + eicons webfonts
  src/modules/site/content/*.ts            rendered Elementor markup per page/template
  src/modules/site/cf7/forms/f<ID>.ts      Contact Form 7 definitions (template, mail, messages)
  public/wp-content/plugins/...            lottie + chart runtime libs used by the widgets

Ground truth is the rendered live HTML in ../backup/live_mirror (the same
markup + CSS the live site serves), so the replica is pixel-identical.
"""
import json
import os
import re
import shutil
import sys

APP = os.path.abspath(os.getcwd())
ROOT = os.path.dirname(APP)
BK = os.path.join(ROOT, "backup")
WP = os.path.join(BK, "site", "website_6f76c53a")
MIRROR = os.path.join(BK, "live_mirror")
OUT_STYLES = os.path.join(APP, "src/modules/site/styles")
OUT_CONTENT = os.path.join(APP, "src/modules/site/content")
OUT_FORMS = os.path.join(APP, "src/modules/site/cf7/forms")

if not os.path.isdir(MIRROR):
    sys.exit("run from the app/ folder (../backup/live_mirror not found)")

PAGES = ["home", "about-us", "services", "contact", "mustang-mortgage"]
SITE_RE = re.compile(r"https?://(?:www\.)?mustangmortgage\.com\.au|https?://scp\.anc\.temporary\.site/website_6f76c53a")

SKIP_LINK = re.compile(r"^(um_|select2|ssa-|elementor-gf-local|wpr-lightgallery|wpr-loading-animations)")
SKIP_STYLE_ID = {
    "wp-img-auto-sizes-contain-inline-css", "wp-emoji-styles-inline-css", "classic-theme-styles-inline-css",
    "global-styles-inline-css", "nfd-wonder-blocks-utilities-inline-css", "mmcrm-portal-inline-css",
    "wpr_lightbox_styles",
}

FONT_VARS = {"Poppins": "--font-poppins", "Montserrat": "--font-montserrat", "Lato": "--font-lato", "Roboto": "--font-roboto"}


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)


def fix_urls(s):
    s = SITE_RE.sub("", s)
    return s


def fix_css(css, base_url=""):
    css = fix_urls(css)
    css = css.replace("url('')", "none").replace('url("")', "none")
    # font families -> next/font CSS variables
    for fam, var in FONT_VARS.items():
        css = re.sub(r'(font-family\s*:\s*)(["\']?)%s\2(?![\w ])' % fam, r"\1var(%s)" % var, css)
    # Font Awesome / eicons webfonts -> local copies
    def font_url(m):
        u = m.group(2).split("?")[0].split("#")[0]
        name = os.path.basename(u)
        if re.search(r"\.(woff2?|ttf|eot|svg)$", name) and ("webfonts" in u or "fonts/" in u):
            return "url(./fonts/%s)" % name
        if u.startswith("../") or (not u.startswith("/") and not u.startswith("data:") and not u.startswith("http") and not u.startswith("#")):
            # relative to the original stylesheet location
            if base_url:
                return "url(%s)" % os.path.normpath(os.path.join(os.path.dirname(base_url), u))
        return m.group(0)
    css = re.sub(r"url\((['\"]?)([^)'\"]+)\1\)", font_url, css)
    # keep only woff2/woff sources in @font-face (smaller bundle, css-loader friendly)
    def ff(m):
        block = m.group(0)
        srcs = re.findall(r"url\(\./fonts/[^)]+\.(?:woff2|woff)\)\s*format\([^)]*\)", block)
        if not srcs:
            return block
        block = re.sub(r"src\s*:[^;}]*;?", "", block)
        return block.rstrip("}").rstrip().rstrip(";") + ";src:" + ",".join(srcs) + "}"
    css = re.sub(r"@font-face\s*\{[^}]*\}", ff, css)
    return css


# Royal Addons ships ~450KB of CSS for ~80 widgets; drop rules of widget families
# this site never renders (products, grids, magazine, forms, ...).
UNUSED_WPR = set("""grid tabs sharing mgzn product forms magazine added pricing hotspot insta timeline tab wishlist af
mini promo post ticker form google compare ba prbar comment vplaylist cart twitter checkout price field atc weather popup
mega onepage taxonomy table search member circle gallery unfold thumbnail quantity pc author step""".split())


def purge_wpr(css):
    def sel_ok(sel):
        return not any(c.split("-")[1] in UNUSED_WPR for c in re.findall(r"\.(wpr-[\w-]+)", sel))

    def walk(s):
        out, i, n = [], 0, len(s)
        while i < n:
            j = s.find("{", i)
            if j < 0:
                out.append(s[i:])
                break
            head = s[i:j]
            # find matching brace
            depth, k = 0, j
            while k < n:
                if s[k] == "{":
                    depth += 1
                elif s[k] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            body = s[j + 1:k]
            h = head.strip()
            if h.startswith("@media") or h.startswith("@supports"):
                inner = walk(body)
                if inner.strip():
                    out.append(head + "{" + inner + "}")
            elif h.startswith("@"):
                out.append(head + "{" + body + "}")
            else:
                sels = [x for x in h.split(",") if sel_ok(x)]
                if sels:
                    out.append(",".join(sels) + "{" + body + "}")
            i = k + 1
        return "".join(out)
    return walk(css)


def local_path(href):
    u = SITE_RE.sub("", href).split("?")[0]
    return os.path.join(WP, u.lstrip("/")), u


def balanced_div(s, start):
    """Return end index (exclusive) of the <div ...> element starting at `start`."""
    depth = 0
    for m in re.finditer(r"<div\b|</div\s*>", s[start:]):
        if m.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                return start + m.end()
        else:
            depth += 1
    raise ValueError("unbalanced div")


def extract_fragment(s, marker):
    i = s.find(marker)
    if i < 0:
        raise ValueError(marker)
    i = s.rfind("<div", 0, i + 1)
    return i, balanced_div(s, i)


# ---------------------------------------------------------------- CSS
def build_css():
    parts, seen = [], set()
    frag_spans = {}
    for p in PAGES:
        s = read(os.path.join(MIRROR, "page_%s.html" % p))
        spans = []
        for mk in ['data-elementor-id="183"', 'data-elementor-type="wp-page"', 'data-elementor-id="173"', 'data-elementor-id="2380"']:
            spans.append(extract_fragment(s, mk))
        frag_spans[p] = spans
        for m in re.finditer(r"<link rel='stylesheet' id='([^']*)' href='([^']*)'[^>]*>|<style([^>]*)>(.*?)</style>", s, re.S):
            if any(a <= m.start() < b for a, b in spans):
                continue  # inline <style> inside a fragment stays with the fragment
            if m.group(1):
                lid, href = m.group(1), m.group(2)
                if SKIP_LINK.match(lid) or lid in seen:
                    continue
                seen.add(lid)
                path, url = local_path(href)
                if not os.path.exists(path):
                    # not in the file backup -> copy fetched from the live site, kept next to this script
                    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.path.basename(url))
                if not os.path.exists(path):
                    print("  ! missing stylesheet", url)
                    continue
                raw = read(path)
                if lid == "wpr-addons-css-css":
                    raw = purge_wpr(raw)
                parts.append("/* %s */\n%s" % (lid, fix_css(raw, url)))
            else:
                attrs, body = m.group(3), m.group(4)
                sid = re.search(r'id="([^"]*)"', attrs)
                if sid and sid.group(1) in SKIP_STYLE_ID:
                    continue
                if "e-lazyloaded" in body:
                    continue
                key = body.strip()
                if key in seen:
                    continue
                seen.add(key)
                if sid and sid.group(1) == "wp-custom-css":
                    # site-wide `.container`/`body` overrides would break other modules' pages
                    body = re.sub(r"body\s*\{[^}]*\}", "", body)
                    body = re.sub(r"\.container\s*\{[^}]*\}", "", body)
                parts.append("/* inline %s */\n%s" % (sid.group(1) if sid else "style", fix_css(body)))
    # Generated CSS of templates not present in the mirrored pages (404)
    for extra in ["post-245.css"]:
        url = "/wp-content/uploads/elementor/css/" + extra
        parts.append("/* %s */\n%s" % (extra, fix_css(read(os.path.join(WP, url.lstrip("/"))), url)))
    css = "/* AUTO-GENERATED by src/modules/site/tools/build_site_assets.py - do not edit */\n" + "\n".join(parts)
    write(os.path.join(OUT_STYLES, "elementor.css"), css)
    # fonts
    fdir = os.path.join(OUT_STYLES, "fonts")
    os.makedirs(fdir, exist_ok=True)
    for src in [os.path.join(WP, "wp-content/plugins/elementor/assets/lib/font-awesome/webfonts"),
                os.path.join(WP, "wp-content/plugins/elementor/assets/lib/eicons/fonts")]:
        for f in os.listdir(src):
            if f.endswith((".woff2", ".woff")):
                shutil.copy(os.path.join(src, f), os.path.join(fdir, f))
    leftovers = sorted(set(re.findall(r"url\((?!\./fonts/|/|data:|#|none)[^)]*\)", css)))
    if leftovers:
        print("  ! unresolved css urls:", leftovers[:20])
    print("css: %d KB" % (len(css) // 1024))
    return frag_spans


# ---------------------------------------------------------------- HTML fragments
def clean_fragment(html, scripts):
    html = re.sub(r'<span class="wpr-template-edit-btn"[^>]*>.*?</span>', "", html, flags=re.S)
    # Contact Form 7 instances -> React slot
    while True:
        m = re.search(r'<div class="wpcf7 no-js" id="wpcf7-f(\d+)-(?:p\d+-)?o\d+"', html)
        if not m:
            break
        end = balanced_div(html, m.start())
        html = html[:m.start()] + '<div class="mm-cf7-slot" data-cf7-slot="%s"></div>' % m.group(1) + html[end:]
    # Mustang Mini-CRM public lead form -> React slot
    m = re.search(r'<div class="mmf-page">', html)
    if m:
        end = balanced_div(html, m.start())
        fid = re.search(r"formId&quot;:(\d+)", html[m.start():end])
        html = html[:m.start()] + '<div class="mm-mmf-slot" data-mmf-slot="%s"></div>' % (fid.group(1) if fid else "") + html[end:]

    def grab_script(m):
        attrs, body = m.group(1), m.group(2)
        if "src=" in attrs:
            src = re.search(r'src=["\']([^"\']+)', attrs).group(1)
            scripts.append({"src": fix_urls(src)})
        elif body.strip() and "application/ld+json" not in attrs:
            scripts.append({"code": fix_urls(body)})
        return ""
    html = re.sub(r"<script([^>]*)>(.*?)</script>", grab_script, html, flags=re.S)
    html = re.sub(r"<style([^>]*)>(.*?)</style>", lambda m: "<style%s>%s</style>" % (m.group(1), fix_css(m.group(2))), html, flags=re.S)
    html = re.sub(r'href="(https?://(?:www\.)?mustangmortgage\.com\.au)/?"', 'href="/"', html)
    html = fix_urls(html)
    html = html.replace('href=""', 'href="/"')
    html = re.sub(r"[ \t]*\n\s*\n+", "\n", html)
    html = re.sub(r"\n[ \t]+", "\n", html)
    return html.strip()


def emit_ts(name, html, scripts, comment):
    body = "// AUTO-GENERATED by src/modules/site/tools/build_site_assets.py - do not edit.\n// %s\n" % comment
    body += "export const html: string = %s;\n" % json.dumps(html, ensure_ascii=False)
    body += "export const scripts: { src?: string; code?: string }[] = %s;\n" % json.dumps(scripts, ensure_ascii=False)
    write(os.path.join(OUT_CONTENT, name + ".ts"), body)


def build_fragments(spans):
    for p in PAGES:
        s = read(os.path.join(MIRROR, "page_%s.html" % p))
        a, b = spans[p][1]
        scripts = []
        html = clean_fragment(s[a:b], scripts)
        emit_ts("page-" + p, html, scripts, "Elementor page content of /%s" % ("" if p == "home" else p + "/"))
        print("page %-17s %6d bytes, %d scripts" % (p, len(html), len(scripts)))
    s = read(os.path.join(MIRROR, "page_home.html"))
    for idx, name, comment in [(0, "header", "wpr_template 183 - Software Company V1 Header (+ offcanvas 103)"),
                                (2, "footer", "wpr_template 173 - Software Company V1 Footer"),
                                (3, "floating", "Elementor floating-buttons 2380 (contact chat bubble)")]:
        a, b = spans["home"][idx]
        scripts = []
        html = clean_fragment(s[a:b], scripts)
        if name == "header":
            # active state is applied at render time from the current path
            html = html.replace(" current-menu-item current_page_item", "").replace(' aria-current="page"', "")
            html = html.replace(" wpr-active-menu-item", "")
        if name == "floating":
            html = html.replace('data-document-id="1553"', "")
        emit_ts(name, html, scripts, comment)
        print("tpl  %-17s %6d bytes" % (name, len(html)))


# ---------------------------------------------------------------- CF7 forms
def php_unserialize(s):
    b = s.encode("utf-8")
    pos = 0

    def parse():
        nonlocal pos
        t = chr(b[pos])
        if t == "N":
            pos += 2
            return None
        if t in "bid":
            end = b.index(b";", pos)
            raw = b[pos + 2:end].decode()
            pos = end + 1
            return raw == "1" if t == "b" else (int(raw) if t == "i" else float(raw))
        if t == "s":
            colon = b.index(b":", pos + 2)
            n = int(b[pos + 2:colon])
            val = b[colon + 2:colon + 2 + n].decode("utf-8")
            pos = colon + 2 + n + 2
            return val
        if t == "a":
            colon = b.index(b":", pos + 2)
            n = int(b[pos + 2:colon])
            pos = colon + 2
            out = {}
            for _ in range(n):
                k = parse()
                out[k] = parse()
            pos += 1
            if all(isinstance(k, int) for k in out) and list(out.keys()) == list(range(len(out))):
                return list(out.values())
            return out
        raise ValueError("unsupported php type %r at %d" % (t, pos))
    return parse()


def cf7_autop(template):
    import subprocess
    here = os.path.dirname(os.path.abspath(__file__))
    inc = os.path.join(WP, "wp-content/plugins/contact-form-7/includes")
    r = subprocess.run(["php", os.path.join(here, "cf7_autop.php"), inc], input=template.encode("utf-8"),
                       capture_output=True, check=True)
    return r.stdout.decode("utf-8")


def build_forms():
    d = os.path.join(BK, "db_export")
    for f in sorted(os.listdir(d)):
        m = re.match(r"wpcf7_contact_form__(\d+)__", f)
        if not m:
            continue
        fid = int(m.group(1))
        s = read(os.path.join(d, f))
        title = s.split("### TITLE\n", 1)[1].split("\n", 1)[0].strip()
        meta = s[s.index("### META"):]
        keys = ["_form", "_mail", "_mail_2", "_messages", "_additional_settings", "_locale", "_hash"]
        vals = {}
        for i, k in enumerate(keys):
            start = meta.index("\n%s = " % k) + len(k) + 4
            nxt = [meta.find("\n%s = " % k2, start) for k2 in keys[i + 1:]]
            nxt = [x for x in nxt if x >= 0]
            nxt.append(meta.find("\n_config_validation = ", start) if meta.find("\n_config_validation = ", start) >= 0 else len(meta))
            vals[k] = meta[start:min(nxt)]
        defn = {
            "id": fid,
            "title": title,
            "hash": vals["_hash"].strip()[:7],
            "locale": vals["_locale"].strip(),
            "template": vals["_form"].rstrip("\n"),
            "html": cf7_autop(vals["_form"]),
            "mail": php_unserialize(vals["_mail"].strip()),
            "mail2": php_unserialize(vals["_mail_2"].strip()),
            "messages": php_unserialize(vals["_messages"].strip()),
            "additionalSettings": vals["_additional_settings"].strip(),
        }
        out = "// AUTO-GENERATED by src/modules/site/tools/build_site_assets.py from %s - do not edit.\n" % f
        out += 'import type { Cf7Definition } from "../types";\n\n'
        out += "const form: Cf7Definition = %s;\nexport default form;\n" % json.dumps(defn, ensure_ascii=False, indent=1)
        write(os.path.join(OUT_FORMS, "f%d.ts" % fid), out)
        print("form %d %s" % (fid, title))


def copy_libs():
    libs = ["wp-content/plugins/royal-elementor-addons/assets/js/lib/lottie/lottie.min.js",
            "wp-content/plugins/royal-elementor-addons/assets/js/lib/charts/charts.min.js"]
    for rel in libs:
        dst = os.path.join(APP, "public", rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy(os.path.join(WP, rel), dst)


if __name__ == "__main__":
    spans = build_css()
    build_fragments(spans)
    build_forms()
    copy_libs()
