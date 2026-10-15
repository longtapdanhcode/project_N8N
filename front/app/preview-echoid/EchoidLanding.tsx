"use client";

import React, { useState, useEffect, useRef } from "react";
import "./echoid.css";

export function EchoidLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    hamburgerRef.current?.focus();
  };

  // Keyboard navigation & resize handler & body scroll lock
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
        <a href="#home" className="hero__logo" aria-label="ECHOID Home">
          ECHOID
        </a>

        <div className="hero__nav-cluster">
          <nav className="hero__nav-links" aria-label="Desktop Navigation">
            <a href="#story" className="hero__nav-link">
              Story
            </a>
            <a href="#platforms" className="hero__nav-link">
              Platforms
            </a>
            <a href="#identity" className="hero__nav-link">
              Identity
            </a>
            <a href="#contact" className="hero__nav-link">
              Contact
            </a>
          </nav>

          <a href="#join" className="hero__nav-cta">
            Join up
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
          href="#story"
          className="hero__mobile-item hero__mobile-link"
          style={{ "--i": 0 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Story
        </a>
        <a
          href="#platforms"
          className="hero__mobile-item hero__mobile-link"
          style={{ "--i": 1 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Platforms
        </a>
        <a
          href="#identity"
          className="hero__mobile-item hero__mobile-link"
          style={{ "--i": 2 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Identity
        </a>
        <a
          href="#contact"
          className="hero__mobile-item hero__mobile-link"
          style={{ "--i": 3 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Contact
        </a>
        <a
          href="#join"
          className="hero__mobile-item hero__mobile-cta"
          style={{ "--i": 4 } as React.CSSProperties}
          onClick={closeMenu}
        >
          Join up
        </a>
      </div>

      {/* 6. RIGHT PANEL */}
      <main className="hero__body">
        <section className="panel" aria-label="Voice Entry Sign Up">
          <span className="panel__chip">[ VOICE ENTRY ]</span>
          <h1 className="panel__title">ECHOID</h1>
          <p className="panel__tagline">Your voice ID to the E network.</p>

          <form
            className="panel__form"
            noValidate
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              className="panel__email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button type="submit" className="btn--ghost">
              Proceed using email
            </button>

            <button type="submit" className="btn--solid">
              Access
            </button>
          </form>

          <a href="#invite" className="panel__invite">
            I&apos;ve got an invite key
          </a>
        </section>
      </main>

      {/* 7. LEGAL FOOTER */}
      <footer className="hero__footer">
        Opening an e.xyz account signals that you accept our{" "}
        <a href="#privacy-notice">Privacy Notice</a> and{" "}
        <a href="#service-contract">Service Contract</a>.
      </footer>
    </div>
  );
}
