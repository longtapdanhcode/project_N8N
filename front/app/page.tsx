"use client";

import React, { useState, useEffect, useRef } from "react";
import "./echoid-login.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const closeMenu = () => {
    setIsMenuOpen(false);
    hamburgerRef.current?.focus();
  };

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        closeMenu();
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 901 && isMenuOpen) {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isMenuOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Tài khoản hoặc mật khẩu không chính xác.");
      }

      const cacheBuster = `?t=${Date.now()}`;
      if (data.destination && data.destination.includes("/student")) {
        const destination =
          (data.destination || "/student/index.html").replace(
            /\/index\.html.*$/,
            "/index.html"
          ) + cacheBuster;
        window.location.replace(destination);
      } else {
        const destination = (data.destination || "/teacher") + cacheBuster;
        window.location.replace(destination);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập.");
      setBusy(false);
    }
  };



  return (
    <div className="hero">
      {/* 3. MEDIA LAYER & SCRIM OVERLAYS */}
      <div className="hero__media">
        <video
          className="hero__video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_132328_5f9029c8-218f-4489-82b6-29ff2849920e.png"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_133255_956f653f-5d80-4b06-abd5-0f46c98b60fa.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero__scrim" />
      </div>

      {/* 5. NAVBAR */}
      <header className="hero__nav">
        <a href="/" className="hero__logo" aria-label="VKU AI Portal">
          VKU AI
        </a>

        <div className="hero__nav-cluster">
          <nav className="hero__nav-links" aria-label="Desktop Navigation">
            <a href="#rules" className="hero__nav-link">
              Quy chế
            </a>
            <a href="#daotao" className="hero__nav-link">
              Đào tạo
            </a>
            <a href="#support" className="hero__nav-link">
              Hỗ trợ SV
            </a>
            <a href="#contact" className="hero__nav-link">
              Liên hệ
            </a>
          </nav>

          <a href="#login" className="hero__nav-cta">
            Access Portal
          </a>

          <button
            ref={hamburgerRef}
            type="button"
            className={`hero__hamburger ${isMenuOpen ? "is-active" : ""}`}
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobileMenu"
          >
            <span className="hero__hamburger-bar" />
            <span className="hero__hamburger-bar" />
            <span className="hero__hamburger-bar" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        id="mobileMenu"
        className={`hero__mobile-menu ${isMenuOpen ? "is-open" : ""}`}
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        <a
          href="#rules"
          className="hero__mobile-item hero__mobile-link"
          style={{ "--i": 0 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Quy chế
        </a>
        <a
          href="#daotao"
          className="hero__mobile-item hero__mobile-link"
          style={{ "--i": 1 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Đào tạo
        </a>
        <a
          href="#support"
          className="hero__mobile-item hero__mobile-link"
          style={{ "--i": 2 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Hỗ trợ SV
        </a>
        <a
          href="#contact"
          className="hero__mobile-item hero__mobile-link"
          style={{ "--i": 3 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Liên hệ
        </a>
        <a
          href="#login"
          className="hero__mobile-item hero__mobile-cta"
          style={{ "--i": 4 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Access Portal
        </a>
      </div>

      {/* 6. RIGHT PANEL */}
      <main className="hero__body" id="login">
        <section className="panel" aria-label="VKU Academic Login">
          <span className="panel__chip">[ ACADEMIC ENTRY ]</span>
          <h1 className="panel__title">VKU ID</h1>
          <p className="panel__tagline">
            YOUR DIGITAL IDENTITY TO THE VKU NETWORK.
          </p>

          <form className="panel__form" noValidate onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="sr-only">
                Tài khoản hoặc MSSV
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                placeholder="MSSV hoặc tài khoản giảng viên (hoặc email)"
                className="panel__input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Mật khẩu"
                className="panel__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </div>

            {error && (
              <p className="panel__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn--solid" disabled={busy}>
              {busy ? "AUTHENTICATING…" : "ACCESS PORTAL"}
            </button>


          </form>

          <a href="#support" className="panel__invite">
            Need academic support? Contact VKU IT Desk
          </a>
        </section>
      </main>

      {/* 7. LEGAL FOOTER */}
      <footer className="hero__footer">
        Đăng nhập vào hệ thống đồng nghĩa với việc bạn tuân thủ{" "}
        <a href="#rules">Quy chế Đào tạo</a> và{" "}
        <a href="#security">Quy định Bảo mật VKU</a>.
      </footer>
    </div>
  );
}
