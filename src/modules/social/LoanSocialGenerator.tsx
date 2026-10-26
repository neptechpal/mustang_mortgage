"use client";

import "./social.css";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BRAND,
  DEFAULT_FORM,
  PALETTES,
  PALETTE_OPTIONS,
  STAGE_OPTIONS,
  STAGE_STYLES,
  TYPE_ICONS,
  TYPE_LABELS,
  TYPE_OPTIONS,
  buildCaption,
  type LoanForm,
} from "./data";

// Port of the WordPress plugin "MM - Loan Social Post Generator" (admin page).
// Same inputs, palettes, 9:16 tile markup/CSS, caption builder and html2canvas export.

type H2C = (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>;
declare global {
  interface Window {
    html2canvas?: H2C;
  }
}

const H2C_SRC = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
let h2cPromise: Promise<H2C> | null = null;
function loadHtml2Canvas(): Promise<H2C> {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (h2cPromise) return h2cPromise;
  h2cPromise = new Promise<H2C>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = H2C_SRC;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => (window.html2canvas ? resolve(window.html2canvas) : reject(new Error("html2canvas not loaded")));
    s.onerror = () => {
      h2cPromise = null;
      reject(new Error("html2canvas not loaded"));
    };
    document.head.appendChild(s);
  });
  return h2cPromise;
}

function showToast(msg: string) {
  const existing = document.querySelector(".mm-toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.className = "mm-toast";
  t.textContent = msg;
  t.style.cssText =
    "position:fixed;bottom:24px;right:24px;z-index:999999;background:#1e293b;color:#fff;padding:14px 20px;border-radius:12px;font-weight:600;font-size:14px;box-shadow:0 10px 40px rgba(0,0,0,0.3)";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => document.body.removeChild(link), 100);
}

export function LoanSocialGenerator() {
  const [d, setD] = useState<LoanForm>(DEFAULT_FORM);
  const tileRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof LoanForm>(k: K) => (e: { target: { value: string } }) => setD((p) => ({ ...p, [k]: e.target.value as LoanForm[K] }));

  const p = PALETTES[parseInt(d.palette, 10)] || PALETTES[0];
  const stage = STAGE_STYLES[d.stage] || STAGE_STYLES.approved;
  // readForm() in the plugin trims every text input
  const t = useMemo<LoanForm>(
    () => ({
      ...d,
      lender: d.lender.trim(),
      purpose: d.purpose.trim(),
      location: d.location.trim(),
      occupation: d.occupation.trim(),
      visa: d.visa.trim(),
      facts: d.facts.trim(),
    }),
    [d],
  );
  const caption = useMemo(() => buildCaption(t), [t]);
  const factLines = t.facts
    .split(/\r?\n/)
    .filter((x) => x.trim())
    .slice(0, 5);
  const showFacts = !!t.facts && factLines.length > 0;
  const details = [
    { key: "lender", label: "Lender", icon: "fa-solid fa-building-columns", value: t.lender },
    { key: "location", label: "Location", icon: "fa-solid fa-location-dot", value: t.location },
    { key: "occupation", label: "Occupation", icon: "fa-solid fa-briefcase", value: t.occupation },
    { key: "visa", label: "Visa", icon: "fa-solid fa-passport", value: t.visa },
  ];
  const anyDetail = details.some((x) => x.value);

  const tileStyle = {
    "--mm-c1": p.c1,
    "--mm-c1-dark": p.c1Dark,
    "--mm-c2": p.c2,
    "--mm-c3": p.c3,
    "--mm-c2-glow": p.c2Glow,
    "--mm-c3-glow": p.c3Glow,
  } as CSSProperties;

  function copyCaption() {
    navigator.clipboard
      .writeText(caption)
      .then(() => showToast("Caption copied! ✅"))
      .catch(() => showToast("Copy failed"));
  }

  function randomPalette() {
    setD((prev) => ({ ...prev, palette: String(Math.floor(Math.random() * PALETTES.length)) }));
  }

  async function download(format: "png" | "jpg") {
    const node = tileRef.current;
    if (!node) {
      showToast("Error: Preview not found");
      return;
    }
    showToast("Generating image...");

    // Detect mobile; render first, then open tab to reduce popup blocking
    const ua = navigator.userAgent || "";
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS/i.test(ua) || /EdgA|EdgiOS/i.test(ua);
    const renderScale = isMobile ? 2 : 3; // lighter render on mobile to prevent hangs

    let html2canvas: H2C;
    try {
      html2canvas = await loadHtml2Canvas();
    } catch {
      showToast("Error: html2canvas not loaded");
      return;
    }

    try {
      const canvas = await html2canvas(node, {
        backgroundColor: format === "jpg" ? "#000000" : null,
        scale: renderScale,
        useCORS: true,
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
        onclone: (clonedDoc: Document) => {
          const clonedTile = clonedDoc.getElementById("mm_tile");
          if (clonedTile) clonedTile.style.fontFamily = "Inter, system-ui, sans-serif";
        },
      });
      const mime = format === "jpg" ? "image/jpeg" : "image/png";
      const filename = `mustang-loan-${Date.now()}.${format}`;

      let dataUrl: string;
      try {
        dataUrl = canvas.toDataURL(mime, format === "jpg" ? 0.95 : 1.0);
      } catch (e) {
        console.error("Canvas tainted?", e);
        showToast("Error: Content blocked (CORS).");
        return;
      }

      if (isMobile) {
        const tab = window.open("", "_blank");
        if (tab) {
          try {
            tab.document.write(
              '<html><head><title>Save Image</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:20px;background:#0b1220;display:flex;flex-direction:column;align-items:center;font-family:system-ui;color:#fff;text-align:center}img{max-width:100%;height:auto;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,0.55)}p{margin:18px 0;font-size:16px;opacity:0.9;line-height:1.5}</style></head><body>',
            );
            tab.document.write("<p>📱 <strong>Press & hold</strong> the image below, then tap <strong>Save</strong>.</p>");
            tab.document.write('<img src="' + dataUrl + '" alt="Loan Social Post">');
            tab.document.write("</body></html>");
            tab.document.close();
            showToast("Image ready - press & hold to save! 📱");
          } catch {
            window.location.href = dataUrl;
            showToast("Opened image to save — long press.");
          }
        } else {
          window.location.href = dataUrl;
          showToast("Opened image to save — long press.");
        }
        return;
      }

      // Desktop: Prefer Blob
      if (canvas.toBlob) {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              triggerDownload(blobUrl, filename);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            } else {
              triggerDownload(dataUrl, filename);
            }
            showToast("Downloaded! ✅");
          },
          mime,
          format === "jpg" ? 0.95 : 1.0,
        );
      } else {
        triggerDownload(dataUrl, filename);
        showToast("Downloaded! ✅");
      }
    } catch (err) {
      console.error("Download error:", err);
      showToast("Download failed. Try again.");
    }
  }

  return (
    <div className="mm-lsg-root">
      {/* Font (Inter) + Font Awesome 6.5.0, as enqueued by the plugin */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" precedence="default" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" precedence="default" />
      <div className="mm-wrap">
        <h1 style={{ margin: "0 0 16px", fontWeight: 900, fontSize: 24, letterSpacing: "-0.03em", color: "#1e293b" }}>🚀 Loan Social Post Generator</h1>

        <div className="mm-grid">
          <div className="mm-panel">
            <h2>Loan Details</h2>

            <div id="mm_lsg_form">
              <div className="mm-row">
                <div className="mm-field">
                  <label htmlFor="mm_type">Loan Type</label>
                  <select id="mm_type" value={d.type} onChange={set("type")}>
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mm-field">
                  <label htmlFor="mm_stage">Stage</label>
                  <select id="mm_stage" value={d.stage} onChange={set("stage")}>
                    {STAGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mm-field">
                  <label htmlFor="mm_lender">Lender</label>
                  <input id="mm_lender" type="text" placeholder="ANZ, CBA, Westpac..." value={d.lender} onChange={set("lender")} />
                </div>
              </div>

              <div className="mm-row">
                <div className="mm-field">
                  <label htmlFor="mm_purpose">Purpose</label>
                  <input id="mm_purpose" type="text" placeholder="First Home • Refinance • Investment" value={d.purpose} onChange={set("purpose")} />
                </div>
                <div className="mm-field">
                  <label htmlFor="mm_location">Location</label>
                  <input id="mm_location" type="text" placeholder="Sydney, Melbourne..." value={d.location} onChange={set("location")} />
                </div>
              </div>

              <div className="mm-row">
                <div className="mm-field">
                  <label htmlFor="mm_occupation">Occupation</label>
                  <input id="mm_occupation" type="text" placeholder="Nurse, Engineer, Driver..." value={d.occupation} onChange={set("occupation")} />
                </div>
                <div className="mm-field">
                  <label htmlFor="mm_visa">Visa Status</label>
                  <input id="mm_visa" type="text" placeholder="Citizen, PR, 482, 491..." value={d.visa} onChange={set("visa")} />
                </div>
              </div>

              <div className="mm-row">
                <div className="mm-field">
                  <label htmlFor="mm_facts">Quick Facts (Optional)</label>
                  <textarea
                    id="mm_facts"
                    rows={3}
                    placeholder={"• Great rate locked in\n• Fast turnaround (2 days)\n• Complex income accepted"}
                    value={d.facts}
                    onChange={set("facts")}
                  />
                </div>
              </div>

              <h2 style={{ marginTop: 16 }}>Style</h2>

              <div className="mm-row">
                <div className="mm-field">
                  <label htmlFor="mm_palette">Color Theme</label>
                  <select id="mm_palette" value={d.palette} onChange={set("palette")}>
                    {PALETTE_OPTIONS.map((label, i) => (
                      <option key={i} value={String(i)}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mm-actions">
                <button type="button" className="mm-btn mm-btn-ghost" id="mm_btn_rand_palette" onClick={randomPalette}>
                  🎲 Random Color
                </button>
                <button type="button" className="mm-btn mm-btn-primary" id="mm_btn_png" onClick={() => download("png")}>
                  ⬇️ Download PNG
                </button>
                <button type="button" className="mm-btn mm-btn-ghost" id="mm_btn_jpg" onClick={() => download("jpg")}>
                  ⬇️ Download JPG
                </button>
              </div>

              <h2 style={{ marginTop: 16 }}>Caption</h2>

              <div className="mm-actions">
                <button type="button" className="mm-btn mm-btn-primary" id="mm_btn_copy_caption" onClick={copyCaption}>
                  📋 Copy Caption
                </button>
              </div>

              <div className="mm-copybox" id="mm_caption_out">
                {caption}
              </div>

              <div className="mm-help">
                💡 <strong>Tip:</strong> Keep it privacy-safe — no client names, amounts, or exact addresses. Rotate colors each post to keep your feed fresh!
              </div>
            </div>
          </div>

          <div className="mm-preview-wrap">
            <div className="mm-preview-toolbar">
              <div className="mm-badge">
                <i className="fa-solid fa-eye" /> Live Preview
              </div>
              <div className="mm-badge">
                <i className="fa-solid fa-mobile-screen" /> 9:16 Story Format
              </div>
            </div>

            <div className="mm-tile" id="mm_tile" data-stage={d.stage} style={tileStyle} ref={tileRef}>
              <div className="mm-tile-inner">
                {/* Happy Client Banner */}
                <div className="mm-header-wrap">
                  <div className="mm-happy-client">
                    <span className="mm-happy-emoji">🎉</span>
                    <span className="mm-happy-client-text">Another Happy Client</span>
                    <span className="mm-happy-emoji">✨</span>
                  </div>
                </div>

                {/* Header - Tick & Home Icon on same row */}
                <div className="mm-header">
                  <div className="mm-stage-badge">
                    <div className="mm-hero-icon" id="mm_hero_icon">
                      <i className={stage.icon} id="mm_hero_icon_i" />
                    </div>
                    <div className="mm-stage-labels">
                      <div className="mm-stage-text" id="mm_stage_text">
                        {stage.label}
                      </div>
                      <div className="mm-stage-subtext" id="mm_type_text">
                        {TYPE_LABELS[d.type] || "Home Loan"}
                      </div>
                    </div>
                  </div>
                  <div className="mm-type-icon-wrap">
                    <i id="mm_type_icon" className={TYPE_ICONS[d.type] || TYPE_ICONS.home} />
                  </div>
                </div>

                {/* Main */}
                <div className="mm-main">
                  <div className={`mm-purpose-tile${t.purpose ? "" : " is-hidden"}`} id="mm_purpose_tile">
                    <div className="mm-purpose-icon">
                      <i className="fa-solid fa-bullseye" />
                    </div>
                    <div className="mm-purpose-text" id="mm_purpose_text">
                      {t.purpose}
                    </div>
                  </div>

                  <div className={`mm-facts${showFacts ? "" : " is-hidden"}`} id="mm_facts_tile">
                    <div className="mm-facts-icon">
                      <i className="fa-solid fa-list-check" />
                    </div>
                    <div className="mm-facts-content">
                      <div id="mm_facts_text">
                        {showFacts && (
                          <ul>
                            {factLines.map((l, i) => (
                              <li key={i}>{l.startsWith("•") ? l.substring(1) : l}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`mm-details${anyDetail ? "" : " is-hidden"}`} id="mm_details">
                    {details.map((x) => (
                      <div key={x.key} className={`mm-detail-box${x.value ? "" : " is-hidden"}`} id={`mm_box_${x.key}`}>
                        <div className="mm-detail-icon">
                          <i className={x.icon} />
                        </div>
                        <div className="mm-detail-content">
                          <div className="mm-detail-label">{x.label}</div>
                          <div className="mm-detail-value" id={`mm_val_${x.key}`}>
                            {x.value}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="mm-footer">
                  <div className="mm-cta-banner">
                    <div className="mm-cta-text">
                      <span className="mm-cta-emoji">🏠💫</span> Need a home loan? <span className="mm-cta-highlight">Let&apos;s make it happen!</span>
                    </div>
                  </div>
                  <div className="mm-footer-logo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={BRAND.logo} alt={BRAND.name} crossOrigin="anonymous" />
                  </div>
                  <div className="mm-brand-name">{BRAND.name}</div>
                  <div className="mm-contact">
                    <div className="mm-contact-item">
                      <div className="mm-contact-icon">
                        <i className="fa-solid fa-phone" />
                      </div>
                      <span>{BRAND.phone}</span>
                    </div>
                    <div className="mm-contact-item">
                      <div className="mm-contact-icon">
                        <i className="fa-solid fa-envelope" />
                      </div>
                      <span>{BRAND.email}</span>
                    </div>
                  </div>
                  <div className="mm-tagline">{BRAND.tagline}</div>
                </div>
              </div>
            </div>

            <div className="mm-info-text">
              <strong>Perfect for:</strong> Instagram Stories, Facebook Stories, TikTok, Reels
              <br />
              High-resolution PNG export ready for social media
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
