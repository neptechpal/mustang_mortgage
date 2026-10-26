// Vanilla re-implementation of the Elementor + Royal Elementor Addons
// front-end handlers the site uses (jQuery-free). `initElementor(root)` wires
// every widget inside `root` and returns a disposer.
//
// Covered: entrance animations, nav menu (desktop hover + mobile toggle),
// offcanvas drawer, advanced/animated text, content toggle (tabs), flip box,
// advanced accordion, feature list connector lines, lottie, mailchimp
// (newsletter), testimonial carousel, charts, floating contact buttons.

type Disposer = () => void;

const parseSettings = (el: Element): Record<string, unknown> => {
  try {
    return JSON.parse(el.getAttribute("data-settings") || "{}");
  } catch {
    return {};
  }
};

const device = () => {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1025) return "tablet";
  if (w < 1367) return "laptop";
  return "desktop";
};

/** Elementor responsive setting lookup (mobile -> tablet -> laptop -> desktop inheritance). */
function responsive(s: Record<string, unknown>, key: string) {
  const order = ["mobile", "tablet", "laptop"];
  const d = device();
  if (d !== "desktop") {
    for (const dev of order.slice(order.indexOf(d))) {
      const v = s[`${key}_${dev}`];
      if (v !== undefined && v !== "") return v;
    }
  }
  return s[key];
}

function slide(el: HTMLElement, open: boolean, ms = 400) {
  el.style.overflow = "hidden";
  if (open) {
    el.style.display = "block";
    const h = el.scrollHeight;
    el.style.height = "0px";
    requestAnimationFrame(() => {
      el.style.transition = `height ${ms}ms ease`;
      el.style.height = h + "px";
    });
    setTimeout(() => {
      el.style.height = "";
      el.style.overflow = "";
      el.style.transition = "";
    }, ms + 20);
  } else {
    el.style.height = el.scrollHeight + "px";
    requestAnimationFrame(() => {
      el.style.transition = `height ${ms}ms ease`;
      el.style.height = "0px";
    });
    setTimeout(() => {
      el.style.display = "none";
      el.style.height = "";
      el.style.overflow = "";
      el.style.transition = "";
    }, ms + 20);
  }
}

function fade(el: HTMLElement, show: boolean, ms = 400) {
  const token = String(Math.random());
  el.dataset.mmFade = token;
  el.style.transition = `opacity ${ms}ms ease`;
  if (show) {
    el.style.display = "block";
    el.style.opacity = "0";
    requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = "1")));
  } else {
    el.style.opacity = "0";
    setTimeout(() => {
      if (el.dataset.mmFade === token) el.style.display = "none";
    }, ms);
  }
}

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string) {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("failed to load " + src));
        document.head.appendChild(s);
      }),
    );
  }
  return scripts.get(src)!;
}

/* ------------------------------------------------------------------ entrance animations */
function initAnimations(root: HTMLElement): Disposer {
  const els = Array.from(root.querySelectorAll<HTMLElement>(".elementor-invisible"));
  if (!els.length) return () => undefined;
  const timers: number[] = [];
  const reveal = (el: HTMLElement) => {
    const s = parseSettings(el);
    const isWidget = el.classList.contains("elementor-widget");
    const anim = String(responsive(s, isWidget ? "_animation" : "animation") ?? "");
    const delay = Number(s[isWidget ? "_animation_delay" : "animation_delay"] ?? 0) || 0;
    const run = () => {
      el.classList.remove("elementor-invisible");
      if (anim && anim !== "none") el.classList.add("animated", anim);
    };
    if (delay) timers.push(window.setTimeout(run, delay));
    else run();
  };
  if (!("IntersectionObserver" in window)) {
    els.forEach(reveal);
    return () => undefined;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          reveal(e.target as HTMLElement);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  els.forEach((el) => io.observe(el));
  return () => {
    io.disconnect();
    timers.forEach(clearTimeout);
  };
}

/* ------------------------------------------------------------------ nav menu */
function initNavMenu(root: HTMLElement): Disposer {
  const offs: Disposer[] = [];
  root.querySelectorAll<HTMLElement>(".elementor-widget-wpr-nav-menu").forEach((scope) => {
    // desktop: hover fade of first-level sub menus
    scope.querySelectorAll<HTMLElement>(".wpr-nav-menu > li.menu-item-has-children").forEach((li) => {
      const sub = li.querySelector<HTMLElement>(":scope > .wpr-sub-menu");
      if (!sub) return;
      const a = li.querySelector(":scope > a");
      const enter = () => {
        a?.setAttribute("aria-expanded", "true");
        fade(sub, true, 300);
      };
      const leave = () => {
        a?.setAttribute("aria-expanded", "false");
        fade(sub, false, 300);
      };
      li.addEventListener("mouseenter", enter);
      li.addEventListener("mouseleave", leave);
      offs.push(() => {
        li.removeEventListener("mouseenter", enter);
        li.removeEventListener("mouseleave", leave);
      });
    });
    // mobile
    const toggle = scope.querySelector<HTMLElement>(".wpr-mobile-toggle");
    const menu = scope.querySelector<HTMLElement>(".wpr-mobile-nav-menu");
    if (toggle && menu) {
      menu.querySelectorAll(".sub-menu").forEach((s) => {
        s.classList.remove("wpr-sub-menu");
        s.classList.add("wpr-mobile-sub-menu");
      });
      const onToggle = () => {
        toggle.classList.toggle("wpr-mobile-toggle-fx");
        const open = !toggle.classList.contains("wpr-mobile-toggle-open");
        toggle.classList.toggle("wpr-mobile-toggle-open", open);
        slide(menu, open);
      };
      toggle.addEventListener("click", onToggle);
      offs.push(() => toggle.removeEventListener("click", onToggle));
      menu.querySelectorAll<HTMLAnchorElement>(".menu-item-has-children > a").forEach((a) => {
        const onClick = (e: Event) => {
          const li = a.closest("li")!;
          const sub = li.querySelector<HTMLElement>(":scope > .wpr-mobile-sub-menu");
          if (!sub) return;
          if (!li.classList.contains("wpr-mobile-sub-open")) {
            e.preventDefault();
            li.classList.add("wpr-mobile-sub-open");
            slide(sub, true);
          } else {
            li.classList.remove("wpr-mobile-sub-open");
            slide(sub, false);
          }
        };
        a.addEventListener("click", onClick);
        offs.push(() => a.removeEventListener("click", onClick));
      });
    }
  });
  return () => offs.forEach((f) => f());
}

/* ------------------------------------------------------------------ offcanvas */
function initOffcanvas(root: HTMLElement): Disposer {
  const offs: Disposer[] = [];
  root.querySelectorAll<HTMLElement>(".elementor-widget-wpr-offcanvas").forEach((scope) => {
    const trigger = scope.querySelector<HTMLElement>(".wpr-offcanvas-trigger");
    const wrap = scope.querySelector<HTMLElement>(".wpr-offcanvas-wrap");
    const content = wrap?.querySelector<HTMLElement>(".wpr-offcanvas-content");
    if (!trigger || !wrap || !content) return;
    const anim = scope.classList.contains("wpr-offcanvas-entrance-animation-slide")
      ? "slide"
      : scope.classList.contains("wpr-offcanvas-entrance-animation-grow")
        ? "grow"
        : "fade";
    const duration = () => (parseFloat(getComputedStyle(content).animationDuration) || 0.6) * 1000;
    const open = () => {
      document.body.classList.add("wpr-offcanvas-body-overflow");
      fade(wrap, true, duration());
      wrap.classList.add("wpr-offcanvas-wrap-active");
      content.classList.remove(`wpr-offcanvas-${anim}-out`);
      content.classList.add(`wpr-offcanvas-${anim}-in`);
      trigger.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      if (!wrap.classList.contains("wpr-offcanvas-wrap-active")) return;
      document.body.classList.remove("wpr-offcanvas-body-overflow");
      content.classList.remove(`wpr-offcanvas-${anim}-in`);
      content.classList.add(`wpr-offcanvas-${anim}-out`);
      fade(wrap, false, duration());
      wrap.classList.remove("wpr-offcanvas-wrap-active");
      trigger.setAttribute("aria-expanded", "false");
    };
    const onTrigger = () => {
      if (!wrap.classList.contains("wpr-offcanvas-wrap-active")) open();
    };
    const onWrap = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.classList.contains("wpr-offcanvas-content") && !t.closest(".wpr-offcanvas-content")) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const closeBtn = wrap.querySelector(".wpr-close-offcanvas");
    trigger.addEventListener("click", onTrigger);
    wrap.addEventListener("click", onWrap);
    document.addEventListener("keyup", onKey);
    closeBtn?.addEventListener("click", close);
    offs.push(() => {
      trigger.removeEventListener("click", onTrigger);
      wrap.removeEventListener("click", onWrap);
      document.removeEventListener("keyup", onKey);
      closeBtn?.removeEventListener("click", close);
      document.body.classList.remove("wpr-offcanvas-body-overflow");
    });
  });
  return () => offs.forEach((f) => f());
}

/* ------------------------------------------------------------------ animated text */
function initAdvancedText(root: HTMLElement): Disposer {
  const timers: number[] = [];
  root.querySelectorAll<HTMLElement>(".elementor-widget-wpr-advanced-text.wpr-advanced-text-style-animated").forEach((scope) => {
    const animText = scope.querySelector<HTMLElement>(".wpr-anim-text");
    if (!animText) return;
    const words = Array.from(animText.querySelectorAll<HTMLElement>("b"));
    if (!words.length) return;
    const [, delayStr] = (animText.getAttribute("data-anim-duration") || "1000,1200").split(",");
    const delay = parseInt(delayStr, 10) || 1200;
    const loop = animText.getAttribute("data-anim-loop") === "yes";
    words.forEach((w) => w.classList.remove("wpr-anim-text-visible", "wpr-anim-text-hidden"));
    words[0].classList.add("wpr-anim-text-visible");
    let i = 0;
    let count = 0;
    const step = () => {
      if (!loop && ++count >= words.length) return;
      const next = (i + 1) % words.length;
      words[i].classList.remove("wpr-anim-text-visible");
      words[i].classList.add("wpr-anim-text-hidden");
      words[next].classList.remove("wpr-anim-text-hidden");
      words[next].classList.add("wpr-anim-text-visible");
      i = next;
      timers.push(window.setTimeout(step, delay));
    };
    timers.push(window.setTimeout(step, delay));
  });
  return () => timers.forEach(clearTimeout);
}

/* ------------------------------------------------------------------ content toggle */
function initContentToggle(root: HTMLElement): Disposer {
  const offs: Disposer[] = [];
  root.querySelectorAll<HTMLElement>(".elementor-widget-wpr-content-toggle").forEach((scope) => {
    const toggle = scope.querySelector<HTMLElement>(".wpr-content-toggle");
    if (!toggle) return;
    const container = toggle.querySelector<HTMLElement>(".wpr-switcher-container")!;
    const wrap = toggle.querySelector<HTMLElement>(".wpr-switcher-wrap")!;
    const contentWrap = toggle.querySelector<HTMLElement>(".wpr-switcher-content-wrap")!;
    const switchers = Array.from(wrap.querySelectorAll<HTMLElement>(":scope > .wpr-switcher"));
    const contents = Array.from(contentWrap.querySelectorAll<HTMLElement>(":scope > .wpr-switcher-content"));
    const bg = wrap.querySelector<HTMLElement>(":scope > .wpr-switcher-bg");
    const outer = scope.classList.contains("wpr-switcher-label-style-outer");
    let active = (parseInt(container.getAttribute("data-active-switcher") || "1", 10) || 1) - 1;
    switchers[active]?.classList.add("wpr-switcher-active");
    contents[active]?.classList.add("wpr-switcher-content-active", "wpr-animation-enter");
    const setBg = (idx: number) => {
      if (outer || !bg) return;
      const w = 100 / switchers.length;
      bg.style.width = w + "%";
      bg.style.left = idx * w + "%";
    };
    setBg(active);
    const show = (idx: number) => {
      setBg(idx);
      if (!outer) {
        switchers.forEach((s) => s.classList.remove("wpr-switcher-active"));
        switchers[idx].classList.add("wpr-switcher-active");
        if (scope.classList.contains("wpr-switcher-style-dual")) container.setAttribute("data-active-switcher", String(idx + 1));
      }
      contentWrap.style.height = contentWrap.offsetHeight + "px";
      contents.forEach((c) => c.classList.remove("wpr-switcher-content-active", "wpr-animation-enter"));
      contents[idx].classList.add("wpr-switcher-content-active", "wpr-animation-enter");
      contentWrap.style.height = contents[idx].offsetHeight + "px";
      setTimeout(() => (contentWrap.style.height = "auto"), 500);
      active = idx;
    };
    const handlers: [HTMLElement, () => void][] = [];
    if (outer) {
      const onClick = () => {
        const next = active === 0 ? 1 : 0;
        switchers.forEach((s) => s.classList.remove("wpr-switcher-active"));
        switchers[next].classList.add("wpr-switcher-active");
        container.setAttribute("data-active-switcher", String(next + 1));
        show(next);
      };
      handlers.push([wrap, onClick]);
      // labels toggle too (keyboard / larger click target)
      toggle.querySelectorAll<HTMLElement>(".wpr-switcher-inner").forEach((inner, i) => {
        handlers.push([
          inner,
          () => {
            if (i !== active) onClick();
          },
        ]);
        inner.style.cursor = "pointer";
      });
    } else {
      switchers.forEach((s, i) => handlers.push([s, () => show(i)]));
    }
    handlers.forEach(([el, fn]) => el.addEventListener("click", fn));
    offs.push(() => handlers.forEach(([el, fn]) => el.removeEventListener("click", fn)));
  });
  return () => offs.forEach((f) => f());
}

/* ------------------------------------------------------------------ flip box */
function initFlipBox(root: HTMLElement): Disposer {
  const offs: Disposer[] = [];
  root.querySelectorAll<HTMLElement>(".wpr-flip-box").forEach((box) => {
    const trigger = box.getAttribute("data-trigger");
    if (trigger === "hover") {
      const on = () => box.classList.add("wpr-flip-box-active");
      const off = () => box.classList.remove("wpr-flip-box-active");
      box.addEventListener("mouseenter", on);
      box.addEventListener("mouseleave", off);
      offs.push(() => {
        box.removeEventListener("mouseenter", on);
        box.removeEventListener("mouseleave", off);
      });
    } else {
      const sel = trigger === "btn" ? ".wpr-flip-box-btn" : ".wpr-flip-box-front";
      const on = () => box.classList.add("wpr-flip-box-active");
      const outside = (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest(".wpr-flip-box")) box.classList.remove("wpr-flip-box-active");
      };
      box.querySelector(sel)?.addEventListener("click", on);
      window.addEventListener("click", outside);
      offs.push(() => window.removeEventListener("click", outside));
    }
    // the back side links to "#" on the live site; keep it from jumping to the top
    box.querySelectorAll<HTMLAnchorElement>('a.wpr-flip-box-link[href="#"]').forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));
  });
  return () => offs.forEach((f) => f());
}

/* ------------------------------------------------------------------ accordion */
function initAccordion(root: HTMLElement): Disposer {
  const offs: Disposer[] = [];
  root.querySelectorAll<HTMLElement>(".elementor-widget-wpr-advanced-accordion").forEach((scope) => {
    const acc = scope.querySelector<HTMLElement>(".wpr-advanced-accordion");
    if (!acc) return;
    const buttons = Array.from(scope.querySelectorAll<HTMLElement>(".wpr-acc-button"));
    const type = acc.getAttribute("data-accordion-type") || "accordion";
    const speed = (parseFloat(acc.getAttribute("data-interaction-speed") || "0.4") || 0.4) * 1000;
    const activeIndex = (parseInt(acc.getAttribute("data-active-index") || "0", 10) || 0) - 1;
    const toggle = (btn: HTMLElement, force?: boolean) => {
      const panel = btn.nextElementSibling as HTMLElement | null;
      if (!panel) return;
      const open = force ?? !panel.classList.contains("wpr-acc-panel-active");
      btn.classList.toggle("wpr-acc-active", open);
      panel.classList.toggle("wpr-acc-panel-active", open);
      slide(panel, open, speed);
    };
    buttons.forEach((btn, i) => {
      const onClick = (e: Event) => {
        e.preventDefault();
        if (type === "accordion") buttons.forEach((b, j) => j !== i && b.classList.contains("wpr-acc-active") && toggle(b, false));
        toggle(btn);
      };
      btn.addEventListener("click", onClick);
      offs.push(() => btn.removeEventListener("click", onClick));
    });
    if (activeIndex > -1 && buttons[activeIndex]) {
      const panel = buttons[activeIndex].nextElementSibling as HTMLElement | null;
      buttons[activeIndex].classList.add("wpr-acc-active");
      if (panel) {
        panel.classList.add("wpr-acc-panel-active");
        panel.style.display = "block";
      }
    }
  });
  return () => offs.forEach((f) => f());
}

/* ------------------------------------------------------------------ feature list */
function initFeatureList(root: HTMLElement): Disposer {
  const scopes = Array.from(root.querySelectorAll<HTMLElement>(".elementor-widget-wpr-feature-list"));
  if (!scopes.length) return () => undefined;
  const layout = () =>
    scopes.forEach((scope) => {
      const items = Array.from(scope.querySelectorAll<HTMLElement>(".wpr-feature-list-item"));
      items.slice(0, -1).forEach((item, i) => {
        const wrap = item.querySelector<HTMLElement>(".wpr-feature-list-icon-wrap");
        const next = items[i + 1].querySelector<HTMLElement>(".wpr-feature-list-icon-wrap");
        const line = wrap?.querySelector<HTMLElement>(".wpr-feature-list-line");
        if (wrap && next && line) line.style.height = next.getBoundingClientRect().top - wrap.getBoundingClientRect().top + "px";
      });
    });
  layout();
  window.addEventListener("resize", layout);
  const t = window.setTimeout(layout, 1500); // after entrance animations / fonts
  return () => {
    window.removeEventListener("resize", layout);
    clearTimeout(t);
  };
}

/* ------------------------------------------------------------------ lottie */
type LottieApi = {
  loadAnimation: (o: Record<string, unknown>) => {
    setSpeed(n: number): void;
    setDirection(n: number): void;
    play(): void;
    pause(): void;
    destroy(): void;
    addEventListener(ev: string, fn: () => void): void;
  };
};
function initLottie(root: HTMLElement): Disposer {
  const els = Array.from(root.querySelectorAll<HTMLElement>(".wpr-lottie-animations"));
  if (!els.length) return () => undefined;
  let disposed = false;
  const anims: { destroy(): void }[] = [];
  loadScript("/wp-content/plugins/royal-elementor-addons/assets/js/lib/lottie/lottie.min.js")
    .then(() => {
      if (disposed) return;
      const lottie = (window as unknown as { lottie?: LottieApi }).lottie;
      if (!lottie) return;
      els.forEach((el) => {
        const s = parseSettings(el);
        el.innerHTML = "";
        const a = lottie.loadAnimation({
          container: el,
          path: el.getAttribute("data-json-url"),
          renderer: (s.lottie_renderer as string) || "svg",
          loop: s.loop === "yes",
          autoplay: s.autoplay === "yes",
        });
        a.setSpeed(Number(s.speed) || 1);
        if (s.reverse) a.setDirection(-1);
        if (s.trigger === "hover") {
          a.addEventListener("DOMLoaded", () => a.pause());
          el.addEventListener("mouseenter", () => a.play());
          el.addEventListener("mouseleave", () => a.pause());
        }
        anims.push(a);
      });
    })
    .catch(() => undefined);
  return () => {
    disposed = true;
    anims.forEach((a) => a.destroy());
  };
}

/* ------------------------------------------------------------------ newsletter (mailchimp widget) */
function initMailchimp(root: HTMLElement): Disposer {
  const offs: Disposer[] = [];
  root.querySelectorAll<HTMLElement>(".elementor-widget-wpr-mailchimp").forEach((scope) => {
    const form = scope.querySelector<HTMLFormElement>("form.wpr-mailchimp-form");
    if (!form) return;
    const onSubmit = async (e: Event) => {
      e.preventDefault();
      const btn = form.querySelector<HTMLButtonElement>("button")!;
      const text = btn.textContent;
      btn.textContent = btn.getAttribute("data-loading") || text;
      const ok = scope.querySelector<HTMLElement>(".wpr-mailchimp-success-message");
      const err = scope.querySelector<HTMLElement>(".wpr-mailchimp-error-message");
      const msg = scope.querySelector<HTMLElement>(".wpr-mailchimp-message");
      if (ok) ok.style.display = "none";
      if (err) err.style.display = "none";
      let status = "error";
      try {
        const r = await fetch("/api/forms/newsletter", { method: "POST", body: new FormData(form) });
        status = ((await r.json()) as { status: string }).status;
      } catch {
        status = "error";
      }
      btn.textContent = text;
      if (form.getAttribute("data-clear-fields") === "yes") form.reset();
      if (status === "subscribed") {
        if (ok) ok.style.display = "inline";
      } else if (err) err.style.display = "inline";
      if (msg) fade(msg, true, 400);
    };
    form.addEventListener("submit", onSubmit);
    offs.push(() => form.removeEventListener("submit", onSubmit));
  });
  return () => offs.forEach((f) => f());
}

/* ------------------------------------------------------------------ testimonial carousel (slick-like) */
function initTestimonials(root: HTMLElement): Disposer {
  const offs: Disposer[] = [];
  root.querySelectorAll<HTMLElement>(".elementor-widget-wpr-testimonial").forEach((scope) => {
    const carousel = scope.querySelector<HTMLElement>(".wpr-testimonial-carousel");
    if (!carousel || carousel.classList.contains("slick-initialized")) return;
    let cfg: { speed?: number; dots?: boolean; arrows?: boolean; infinite?: boolean; prevArrow?: string; nextArrow?: string } = {};
    try {
      cfg = JSON.parse(carousel.getAttribute("data-slick") || "{}");
    } catch {}
    const cls = scope.className;
    const cols = () => {
      const d = device();
      const m = (re: RegExp, def: number) => (cls.match(re) ? Number(cls.match(re)![0].slice(-1)) : def);
      const desktop = m(/wpr-testimonial-slider-columns-\d/, 2);
      if (d === "mobile") return m(/columns--mobile\d/, 1);
      if (d === "tablet") return m(/columns--tablet\d/, 2);
      if (d === "laptop") return m(/columns--laptop\d/, desktop);
      return desktop;
    };
    const slides = Array.from(carousel.children) as HTMLElement[];
    const list = document.createElement("div");
    list.className = "slick-list draggable";
    const track = document.createElement("div");
    track.className = "slick-track";
    track.style.display = "flex";
    slides.forEach((s) => {
      s.classList.add("slick-slide");
      track.appendChild(s);
    });
    list.appendChild(track);
    list.style.overflow = "hidden";
    carousel.appendChild(list);
    carousel.classList.add("slick-initialized", "slick-slider");
    const dotsHost = scope.querySelector<HTMLElement>(".wpr-testimonial-dots");
    const dots = document.createElement("ul");
    dots.className = "slick-dots";
    if (cfg.dots && dotsHost) dotsHost.appendChild(dots);
    let index = 0;
    const pages = () => Math.max(1, slides.length - cols() + 1);
    const render = () => {
      const c = cols();
      const w = list.clientWidth / c;
      slides.forEach((s, i) => {
        s.style.width = w + "px";
        s.style.flex = `0 0 ${w}px`;
        s.classList.toggle("slick-active", i >= index && i < index + c);
        s.setAttribute("aria-hidden", i >= index && i < index + c ? "false" : "true");
      });
      track.style.transition = `transform ${cfg.speed ?? 500}ms ease`;
      track.style.transform = `translate3d(${-index * w}px,0,0)`;
      dots.innerHTML = "";
      for (let i = 0; i < pages(); i++) {
        const li = document.createElement("li");
        if (i === index) li.className = "slick-active";
        li.innerHTML = '<span class="wpr-testimonial-dot"></span>';
        li.addEventListener("click", () => go(i));
        dots.appendChild(li);
      }
    };
    const go = (i: number) => {
      const n = pages();
      index = cfg.infinite === false ? Math.min(Math.max(i, 0), n - 1) : (i + n) % n;
      render();
    };
    const prev = cfg.prevArrow ? scope.querySelector<HTMLElement>(cfg.prevArrow) : null;
    const next = cfg.nextArrow ? scope.querySelector<HTMLElement>(cfg.nextArrow) : null;
    const onPrev = () => go(index - 1);
    const onNext = () => go(index + 1);
    prev?.addEventListener("click", onPrev);
    next?.addEventListener("click", onNext);
    window.addEventListener("resize", render);
    render();
    offs.push(() => {
      prev?.removeEventListener("click", onPrev);
      next?.removeEventListener("click", onNext);
      window.removeEventListener("resize", render);
    });
  });
  return () => offs.forEach((f) => f());
}

/* ------------------------------------------------------------------ charts */
type ChartCtor = new (ctx: HTMLCanvasElement, cfg: Record<string, unknown>) => { destroy(): void };
function initCharts(root: HTMLElement): Disposer {
  const els = Array.from(root.querySelectorAll<HTMLElement>(".wpr-charts-container"));
  if (!els.length) return () => undefined;
  let disposed = false;
  const charts: { destroy(): void }[] = [];
  loadScript("/wp-content/plugins/royal-elementor-addons/assets/js/lib/charts/charts.min.js")
    .then(() => {
      const Chart = (window as unknown as { Chart?: ChartCtor }).Chart;
      if (disposed || !Chart) return;
      els.forEach((el) => {
        const s = parseSettings(el) as Record<string, unknown>;
        let canvas = el.querySelector("canvas");
        if (!canvas) {
          canvas = document.createElement("canvas");
          el.appendChild(canvas);
        }
        let datasets: unknown[] = [];
        try {
          datasets = JSON.parse(String(s.chart_datasets || "[]"));
        } catch {}
        charts.push(
          new Chart(canvas, {
            type: s.chart_type || "bar",
            data: { labels: s.chart_labels || [], datasets },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: s.show_chart_legend === "yes" } },
            },
          }),
        );
      });
    })
    .catch(() => undefined);
  return () => {
    disposed = true;
    charts.forEach((c) => c.destroy());
  };
}

/* ------------------------------------------------------------------ floating contact buttons */
function initContactButtons(root: HTMLElement): Disposer {
  const offs: Disposer[] = [];
  root.querySelectorAll<HTMLElement>(".e-contact-buttons").forEach((main) => {
    const wrapper = main.querySelector<HTMLElement>(".e-contact-buttons__content-wrapper");
    const content = main.querySelector<HTMLElement>(".e-contact-buttons__content");
    const chat = main.querySelector<HTMLElement>(".e-contact-buttons__chat-button");
    const close = main.querySelector<HTMLElement>(".e-contact-buttons__close-button");
    const time = main.querySelector<HTMLElement>(".e-contact-buttons__message-bubble-time");
    main.closest(".e-con-inner")?.classList.add("e-con-inner--floating-buttons");
    if (time)
      time.textContent = new Intl.DateTimeFormat("default", { hour12: time.dataset.timeFormat === "12h", hour: "numeric", minute: "numeric" }).format(new Date());
    if (!wrapper || !content) return;
    const isHidden = () => wrapper.classList.contains("hidden");
    const setOpen = (open: boolean) => {
      wrapper.classList.toggle("hidden", !open);
      wrapper.setAttribute("aria-hidden", open ? "false" : "true");
      content.classList.toggle("visible", open);
      chat?.setAttribute("aria-expanded", String(open));
      close?.setAttribute("aria-expanded", String(open));
    };
    const onChat = () => setOpen(isHidden());
    const onClose = () => setOpen(false);
    chat?.addEventListener("click", onChat);
    close?.addEventListener("click", onClose);
    chat?.setAttribute("aria-expanded", "false");
    offs.push(() => {
      chat?.removeEventListener("click", onChat);
      close?.removeEventListener("click", onClose);
    });
  });
  return () => offs.forEach((f) => f());
}

export function initElementor(root: HTMLElement): Disposer {
  const disposers = [
    initNavMenu,
    initOffcanvas,
    initAdvancedText,
    initContentToggle,
    initFlipBox,
    initAccordion,
    initFeatureList,
    initLottie,
    initMailchimp,
    initTestimonials,
    initCharts,
    initContactButtons,
    initAnimations,
  ].map((fn) => {
    try {
      return fn(root);
    } catch (e) {
      console.error("elementor init failed:", fn.name, e);
      return () => undefined;
    }
  });
  return () => disposers.forEach((d) => d());
}

/** Executes inline/external scripts that were part of an Elementor HTML widget. */
export function runFragmentScripts(root: HTMLElement, list: { src?: string; code?: string }[]) {
  for (const s of list) {
    if (s.src) void loadScript(s.src).catch(() => undefined);
    else if (s.code) {
      const el = document.createElement("script");
      el.text = s.code;
      root.appendChild(el);
    }
  }
}
