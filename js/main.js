/* Единый ФПЦ — интерактив лендинга */
(function () {
  "use strict";

  /* ---------- Header scroll state ---------- */
  const header = document.querySelector(".header");
  const onScroll = () => {
    if (window.scrollY > 40) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = document.querySelector(".burger");
  const panel = document.querySelector(".mobile-panel");
  if (burger && panel) {
    const closeBtn = panel.querySelector(".close");
    const openMenu = () => {
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      burger.setAttribute("aria-expanded", "true");
      const first = panel.querySelector("a, button");
      if (first) first.focus();
    };
    const closeMenu = (returnFocus) => {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
      burger.setAttribute("aria-expanded", "false");
      if (returnFocus) burger.focus();
    };
    burger.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", () => closeMenu(true));
    panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => closeMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("open")) closeMenu(true);
    });
  }

  /* ---------- Mark decorative inline SVGs hidden from screen readers ---------- */
  document.querySelectorAll("svg:not([aria-label]):not([role='img'])").forEach((s) => {
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
  });

  /* ---------- Smooth anchor scroll with header offset ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- Stat counters ---------- */
  const counters = document.querySelectorAll("[data-count]");
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split(".")[1] || "").length;
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";
    const dur = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = (target * eased).toFixed(decimals);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach((item, i) => {
    const q = item.querySelector(".faq-q");
    const a = item.querySelector(".faq-a");
    const aid = "faq-panel-" + (i + 1);
    a.id = aid;
    q.setAttribute("aria-expanded", "false");
    q.setAttribute("aria-controls", aid);
    q.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((other) => {
        if (other !== item) {
          other.classList.remove("open");
          other.querySelector(".faq-a").style.maxHeight = null;
          other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
        }
      });
      if (isOpen) {
        item.classList.remove("open");
        a.style.maxHeight = null;
        q.setAttribute("aria-expanded", "false");
      } else {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
        q.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Lead form (Web3Forms) ---------- */
  const form = document.getElementById("lead-form");
  if (form) {
    const status = form.querySelector(".form-status");
    const btn = form.querySelector('button[type="submit"]');
    const btnText = btn ? btn.textContent : "";

    const f = {
      phone: form.querySelector("#phone"),
      email: form.querySelector("#email"),
      consent: form.querySelector("#consent"),
    };

    // Выручка — сегментированные чипы
    const revInput = form.querySelector("#revenue");
    form.querySelectorAll("#revenue-chips .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        form.querySelectorAll("#revenue-chips .chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        if (revInput) revInput.value = chip.dataset.val;
      });
    });
    const wrap = (el) => el && el.closest(".field");
    const flagInvalid = (el) => {
      const w = wrap(el);
      if (el) el.setAttribute("aria-invalid", "true");
      if (!w) return;
      w.classList.add("invalid", "shake");
      setTimeout(() => w.classList.remove("shake"), 360);
    };
    const clearInvalid = (el) => {
      if (el) el.removeAttribute("aria-invalid");
      const w = wrap(el);
      if (w) w.classList.remove("invalid");
    };
    [f.phone, f.email].forEach((el) => el && el.addEventListener("input", () => clearInvalid(el)));

    const validate = () => {
      let firstBad = null;
      const bad = (el) => { flagInvalid(el); if (!firstBad) firstBad = el; };
      const digits = (f.phone.value.match(/\d/g) || []).length;
      if (digits < 5) bad(f.phone);
      if (f.email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) bad(f.email);
      if (!f.consent.checked) {
        status.className = "form-status err";
        status.textContent = "Поставьте галочку согласия на обработку данных.";
        if (!firstBad) firstBad = f.consent;
      }
      if (firstBad) firstBad.focus();
      return !firstBad;
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.className = "form-status";
      status.textContent = "";

      if (!validate()) return;

      const data = new FormData(form);
      const key = data.get("access_key");

      // Если ключ Web3Forms ещё не подставлен — не отправляем «в никуда».
      if (!key || key.includes("REPLACE")) {
        status.className = "form-status err";
        status.textContent =
          "Форма ещё не подключена к почте. Нужно вставить ключ Web3Forms (см. README). Пока напишите на ediniyfpc@efpts.ru или позвоните +7 (499) 130-99-75.";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Отправляем…";

      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data,
        });
        const json = await res.json();
        if (json.success) {
          form.reset();
          const card = form.closest(".form-card");
          const success = card && card.querySelector(".form-success");
          if (success) {
            success.hidden = false;
            card.classList.add("sent");
            success.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            status.className = "form-status ok";
            status.textContent = "Заявка принята. Перезвоним в течение рабочего дня.";
          }
        } else {
          throw new Error(json.message || "submit failed");
        }
      } catch (err) {
        status.className = "form-status err";
        status.textContent =
          "Не удалось отправить. Напишите на ediniyfpc@efpts.ru или позвоните +7 (499) 130-99-75.";
      } finally {
        btn.disabled = false;
        btn.textContent = btnText;
      }
    });
  }

  /* ---------- Year in footer ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
