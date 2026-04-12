import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Mail, ArrowUpRight, Sparkles, Zap, Cpu, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import confetti from 'canvas-confetti';

gsap.registerPlugin(ScrollTrigger);

/* ─── Confetti Burst ─── */
const fireConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#4A90D9', '#7BB3E8', '#F5F4F0', '#E8E4DC', '#22c55e'];

  // Initial big burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors,
    startVelocity: 45,
    gravity: 0.8,
    ticks: 300,
  });

  // Side cannons
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors,
    });
  }, 250);

  // Continuous rain
  const interval = setInterval(() => {
    if (Date.now() > end) return clearInterval(interval);

    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors,
    });
  }, 150);
};

/* ─── Magnetic Button Effect ─── */
const useMagnetic = (ref: React.RefObject<HTMLElement | null>, strength = 0.3) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: x * strength,
        y: y * strength,
        duration: 0.4,
        ease: 'power2.out',
      });
    };

    const handleLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [ref, strength]);
};

/* ─── Custom Cursor ─── */
const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const moveCursor = (e: MouseEvent) => {
      gsap.to(dot, { x: e.clientX - 4, y: e.clientY - 4, duration: 0.08, ease: 'power2.out' });
      gsap.to(ring, { x: e.clientX - 20, y: e.clientY - 20, duration: 0.2, ease: 'power2.out' });
    };

    const grow = () => {
      gsap.to(dot, { scale: 3, duration: 0.3, ease: 'back.out(2)' });
      gsap.to(ring, { scale: 1.5, borderColor: 'rgba(74,144,217,0.8)', duration: 0.3 });
    };
    const shrink = () => {
      gsap.to(dot, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
      gsap.to(ring, { scale: 1, borderColor: 'rgba(74,144,217,0.4)', duration: 0.3 });
    };

    window.addEventListener('mousemove', moveCursor);

    const observe = () => {
      const interactives = document.querySelectorAll('a, button, input, .magnetic-btn, .glass-card-hover');
      interactives.forEach((el) => {
        el.addEventListener('mouseenter', grow);
        el.addEventListener('mouseleave', shrink);
      });
    };

    observe();
    // Re-observe after DOM mutations
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      mo.disconnect();
    };
  }, []);

  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
  if (isTouchDevice) return null;

  return (
    <>
      <div ref={dotRef} className="cursor-dot hidden md:block" />
      <div ref={ringRef} className="cursor-ring hidden md:block" />
    </>
  );
};

/* ─── Scroll Progress ─── */
const ScrollProgress = () => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return;
    gsap.to(barRef.current, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
      },
    });
  }, []);

  return <div ref={barRef} className="scroll-progress" style={{ transform: 'scaleX(0)' }} />;
};

/* ─── Navbar ─── */
const Navbar = () => {
  const navRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    const items = navRef.current.querySelectorAll('.nav-item');
    gsap.fromTo(
      navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, delay: 0.2, ease: 'power3.out' }
    );
    gsap.fromTo(
      items,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, delay: 0.6, ease: 'power3.out' }
    );
  }, []);

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        scrolled
          ? 'py-3 bg-[#0E0E0E]/80 backdrop-blur-xl border-b border-white/[0.04]'
          : 'py-6 bg-transparent'
      }`}
      style={{ opacity: 0 }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
        <div className="nav-item flex items-center gap-3">
          <img
            src="/saltlab-logo.png"
            alt="Saltlab"
            className="w-8 h-8 invert brightness-200 contrast-200"
            style={{ mixBlendMode: 'screen' }}
          />
          <span className="font-display font-semibold text-lg tracking-tight text-salt">
            saltlab
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-mineral">
          <a href="#about" className="nav-item hover:text-salt transition-colors duration-300">about</a>
          <a href="#philosophy" className="nav-item hover:text-salt transition-colors duration-300">philosophy</a>
          <a href="#status" className="nav-item hover:text-salt transition-colors duration-300">status</a>
        </div>
        <a href="mailto:hello@saltlab.app" className="nav-item pill text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
          say hello
        </a>
      </div>
    </nav>
  );
};

/* ─── Hero Section ─── */
const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaBtnRef = useRef<HTMLAnchorElement>(null);
  const floatARef = useRef<HTMLDivElement>(null);
  const floatBRef = useRef<HTMLDivElement>(null);
  const floatCRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  useMagnetic(ctaBtnRef, 0.15);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // Animate the orb first
      tl.fromTo(
        orbRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.5, ease: 'power2.out' }
      );

      // Tag slides down
      tl.fromTo(
        tagRef.current,
        { y: -30, opacity: 0, scale: 0.8, visibility: 'hidden' },
        { y: 0, opacity: 1, scale: 1, visibility: 'visible', duration: 0.8 },
        '-=0.8'
      );

      // Heading — each line with stagger
      const headingLines = headingRef.current?.querySelectorAll('.hero-line');
      if (headingLines) {
        tl.set(headingRef.current, { visibility: 'visible' });
        tl.fromTo(
          headingLines,
          { y: 120, opacity: 0, rotateX: 40 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 1.2,
            stagger: 0.15,
            ease: 'power4.out',
          },
          '-=0.4'
        );
      }

      // Subtitle with clip reveal
      tl.fromTo(
        subRef.current,
        { y: 40, opacity: 0, visibility: 'hidden' },
        { y: 0, opacity: 1, visibility: 'visible', duration: 0.8 },
        '-=0.6'
      );

      // CTA buttons scale + bounce in
      tl.fromTo(
        ctaRef.current,
        { y: 30, opacity: 0, scale: 0.9, visibility: 'hidden' },
        { y: 0, opacity: 1, scale: 1, visibility: 'visible', duration: 0.8, ease: 'back.out(1.7)' },
        '-=0.4'
      );

      // Floating elements with more dramatic movement
      [floatARef, floatBRef, floatCRef].forEach((ref, i) => {
        if (!ref.current) return;
        gsap.set(ref.current, { opacity: 0 });
        gsap.to(ref.current, { opacity: 1, duration: 1, delay: 1.5 + i * 0.2 });
        gsap.to(ref.current, {
          y: `random(-30, 30)`,
          x: `random(-15, 15)`,
          rotation: `random(-8, 8)`,
          duration: 3 + i * 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 1.5 + i * 0.3,
        });
      });

      // Orb breathing animation
      gsap.to(orbRef.current, {
        scale: 1.1,
        opacity: 0.8,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Parallax — gentle, only after 60%
      gsap.to(headingRef.current, {
        y: -60,
        opacity: 0.5,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: '60% top',
          end: 'bottom top',
          scrub: 1.5,
        },
      });

      // Parallax on sub + CTA
      gsap.to([subRef.current, ctaRef.current], {
        y: -30,
        opacity: 0.3,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: '50% top',
          end: 'bottom top',
          scrub: 1.5,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-center items-center px-6 py-32 overflow-hidden"
    >
      {/* Animated gradient orb */}
      <div
        ref={orbRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(74,144,217,0.08) 0%, rgba(74,144,217,0.02) 50%, transparent 70%)',
          opacity: 0,
        }}
      />

      {/* Floating decorative elements */}
      <div
        ref={floatARef}
        className="absolute top-[15%] right-[15%] w-20 h-20 border border-white/[0.04] rounded-2xl rotate-12 hidden md:block"
        style={{ opacity: 0 }}
      />
      <div
        ref={floatBRef}
        className="absolute bottom-[20%] left-[10%] w-16 h-16 border border-signal/[0.1] rounded-full hidden md:block"
        style={{ opacity: 0 }}
      />
      <div
        ref={floatCRef}
        className="absolute top-[60%] right-[8%] hidden md:block"
        style={{ opacity: 0 }}
      >
        <div className="pill">
          <Sparkles className="w-3 h-3" />
          AI-first
        </div>
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-white/[0.02]" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.02]" />
        <div className="absolute left-3/4 top-0 bottom-0 w-px bg-white/[0.02]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center" style={{ perspective: '1000px' }}>
        {/* Tag */}
        <div ref={tagRef} className="mb-8" style={{ visibility: 'hidden' }}>
          <span className="pill">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            indie app studio
          </span>
        </div>

        {/* Heading */}
        <h1
          ref={headingRef}
          className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-[0.9] mb-8"
          style={{ visibility: 'hidden', transformStyle: 'preserve-3d' }}
        >
          <div className="hero-line overflow-hidden">
            <span className="text-salt inline-block">we build</span>
          </div>
          <div className="hero-line overflow-hidden">
            <span className="gradient-text-signal inline-block">tiny, sharp</span>
          </div>
          <div className="hero-line overflow-hidden">
            <span className="text-salt inline-block">AI apps.</span>
          </div>
        </h1>

        {/* Sub */}
        <p
          ref={subRef}
          className="text-lg md:text-xl text-mineral max-w-xl mx-auto leading-relaxed mb-10"
          style={{ visibility: 'hidden' }}
        >
          Focused iOS utilities powered by AI.{' '}
          <span className="text-salt/80">No bloat. No fluff.</span>{' '}
          Just tools that do one thing really well.
        </p>

        {/* CTA */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center" style={{ visibility: 'hidden' }}>
          <a
            ref={ctaBtnRef}
            href="#status"
            className="magnetic-btn group inline-flex items-center gap-2 px-8 py-4 bg-signal text-white rounded-full font-medium text-sm transition-all duration-300 hover:shadow-[0_0_40px_rgba(74,144,217,0.3)] hover:scale-105 active:scale-95"
          >
            Get early access
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#about"
            className="magnetic-btn inline-flex items-center gap-2 px-8 py-4 border border-white/10 text-salt rounded-full font-medium text-sm transition-all duration-300 hover:border-white/25 hover:bg-white/[0.03] active:scale-95"
          >
            Learn more
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2 text-mineral/40 animate-bounce">
          <span className="text-[10px] uppercase tracking-[0.2em] font-mono-brand">scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-mineral/30 to-transparent" />
        </div>
      </div>
    </section>
  );
};

/* ─── Marquee ─── */
const Marquee = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const width = track.scrollWidth / 2;

    const tween = gsap.to(track, {
      x: -width,
      duration: 20,
      ease: 'none',
      repeat: -1,
    });

    // Speed up on scroll
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const velocity = Math.abs(self.getVelocity() / 1000);
        gsap.to(tween, { timeScale: 1 + velocity * 0.5, duration: 0.3 });
      },
    });
  }, []);

  const items = [
    'AI-POWERED', 'iOS NATIVE', 'MINIMAL DESIGN', 'SHARP PURPOSE',
    'INDIE BUILT', 'UTILITY FIRST', 'NO BLOAT', 'SALT CRYSTAL',
  ];

  return (
    <div ref={sectionRef} className="py-8 border-y border-white/[0.04] overflow-hidden">
      <div ref={trackRef} className="marquee-track">
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="text-xl md:text-2xl font-display font-semibold text-white/[0.07] whitespace-nowrap flex items-center gap-6 hover:text-white/[0.15] transition-colors duration-500"
          >
            {item}
            <span className="w-2 h-2 rounded-full bg-signal/20" />
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─── About Section ─── */
const About = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Heading with split line animation
      const headingLines = headingRef.current?.querySelectorAll('.about-line');
      if (headingLines) {
        gsap.fromTo(
          headingLines,
          { y: 60, opacity: 0, skewY: 3 },
          {
            y: 0,
            opacity: 1,
            skewY: 0,
            duration: 1,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: headingRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Cards with 3D rotation entrance
      if (cardsRef.current) {
        gsap.fromTo(
          cardsRef.current.children,
          { y: 100, opacity: 0, rotateY: -10, scale: 0.9 },
          {
            y: 0,
            opacity: 1,
            rotateY: 0,
            scale: 1,
            duration: 1,
            stagger: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const values = [
    {
      num: '01',
      title: 'Minimal',
      desc: 'No noise. No fluff. Just the thing. Every pixel has a job.',
      icon: <Zap className="w-5 h-5 text-signal" />,
    },
    {
      num: '02',
      title: 'Sharp',
      desc: 'Utility first. Every feature earns its place. Nothing extra.',
      icon: <Cpu className="w-5 h-5 text-signal" />,
    },
    {
      num: '03',
      title: 'Indie',
      desc: "Built by one person. Feels like it — in the best way possible.",
      icon: <Smartphone className="w-5 h-5 text-signal" />,
    },
  ];

  return (
    <section ref={sectionRef} id="about" className="py-24 md:py-40 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
          {/* Left */}
          <div>
            <span className="pill mb-6 inline-flex">about us</span>
            <h2
              ref={headingRef}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-salt"
              style={{ perspective: '800px' }}
            >
              <div className="about-line overflow-hidden" style={{ opacity: 0 }}>
                <span className="inline-block">We're an indie studio</span>
              </div>
              <div className="about-line overflow-hidden" style={{ opacity: 0 }}>
                <span className="text-mineral inline-block">building apps that</span>
              </div>
              <div className="about-line overflow-hidden" style={{ opacity: 0 }}>
                <span className="gradient-text-signal inline-block">actually help.</span>
              </div>
            </h2>
          </div>

          {/* Right - Cards */}
          <div ref={cardsRef} className="space-y-4 md:pt-8" style={{ perspective: '600px' }}>
            {values.map((v) => (
              <div
                key={v.num}
                className="glass-card glass-card-hover rounded-2xl p-6 md:p-8 group"
                style={{ opacity: 0 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="font-mono-brand text-xs text-signal">{v.num}</span>
                  <div className="transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                    {v.icon}
                  </div>
                </div>
                <h3 className="font-display text-xl font-semibold text-salt mb-2 transition-colors duration-300 group-hover:text-signal">
                  {v.title}
                </h3>
                <p className="text-mineral text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Philosophy Section ─── */
const Philosophy = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Pill animation
      gsap.fromTo(
        pillRef.current,
        { x: -30, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      if (!textRef.current) return;
      const words = textRef.current.querySelectorAll('.word-reveal');

      // Word-by-word reveal with scale
      gsap.fromTo(
        words,
        { opacity: 0.08, scale: 0.98, filter: 'blur(2px)' },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          stagger: 0.04,
          ease: 'none',
          scrollTrigger: {
            trigger: textRef.current,
            start: 'top 70%',
            end: 'bottom 30%',
            scrub: 1,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const statement =
    "We don't chase downloads. We chase usefulness. Every app we ship solves one real problem, feels native on iOS, and stays out of your way. That's the whole philosophy.";

  return (
    <section ref={sectionRef} id="philosophy" className="py-24 md:py-40 px-6 md:px-10 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-signal/[0.02] to-transparent pointer-events-none" />
      <div className="max-w-5xl mx-auto relative">
        <span ref={pillRef} className="pill mb-12 inline-flex" style={{ opacity: 0 }}>
          philosophy
        </span>
        <div ref={textRef} className="font-display text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
          {statement.split(' ').map((word, i) => (
            <span
              key={i}
              className="word-reveal inline-block mr-[0.3em] text-salt transition-colors duration-200 hover:text-signal cursor-default"
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Highlights ─── */
const Highlights = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!itemsRef.current) return;
      const items = itemsRef.current.children;

      gsap.fromTo(
        items,
        { y: 60, opacity: 0, scale: 0.9 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: 'back.out(1.2)',
          scrollTrigger: {
            trigger: itemsRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Counter animation for the "1" stat
      const counterEl = itemsRef.current.querySelector('.counter-animate');
      if (counterEl) {
        const target = { val: 0 };
        gsap.to(target, {
          val: 1,
          duration: 1.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: itemsRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
          onUpdate: () => {
            counterEl.textContent = Math.round(target.val).toString();
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const stats = [
    { label: 'Focus', value: 'iOS', sub: 'Native experiences only', isCounter: false },
    { label: 'Stack', value: 'AI', sub: 'Intelligence at the core', isCounter: false },
    { label: 'Team', value: '1', sub: 'Indie, end to end', isCounter: true },
    { label: 'Apps', value: 'Soon', sub: 'First one is cooking', isCounter: false },
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-24 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div ref={itemsRef} className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-[#0E0E0E] p-8 md:p-10 text-center group hover:bg-white/[0.02] transition-colors duration-500"
              style={{ opacity: 0 }}
            >
              <p className="font-mono-brand text-[10px] uppercase tracking-[0.2em] text-signal mb-3">
                {s.label}
              </p>
              <p className={`font-display text-4xl md:text-5xl font-bold text-salt mb-2 transition-transform duration-300 group-hover:scale-110 ${s.isCounter ? 'counter-animate' : ''}`}>
                {s.value}
              </p>
              <p className="text-xs text-mineral">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Status / CTA Section ─── */
const Status = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!contentRef.current) return;

      // Card entrance with dramatic scale
      gsap.fromTo(
        contentRef.current,
        { y: 80, opacity: 0, scale: 0.92, rotateX: 5 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotateX: 0,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (email) {
        setIsSubmitted(true);

        // Fire confetti
        fireConfetti();

        // Animate the success message in
        setTimeout(() => {
          const successEl = document.querySelector('.success-message');
          if (successEl) {
            gsap.fromTo(
              successEl,
              { scale: 0.8, opacity: 0, y: 20 },
              { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(2)' }
            );
          }
        }, 50);

        setTimeout(() => {
          setIsSubmitted(false);
          setEmail('');
        }, 5000);
      }
    },
    [email]
  );

  return (
    <section ref={sectionRef} id="status" className="py-24 md:py-40 px-6 md:px-10">
      <div className="max-w-4xl mx-auto" style={{ perspective: '800px' }}>
        <div ref={contentRef} className="relative" style={{ opacity: 0 }}>
          {/* Glow behind card */}
          <div className="absolute -inset-4 bg-signal/[0.04] rounded-[2rem] blur-2xl pointer-events-none" />

          <div className="relative glass-card rounded-3xl p-8 md:p-14 overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-signal/[0.08] to-transparent rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-signal/[0.04] to-transparent rounded-tr-full pointer-events-none" />

            <div className="flex items-center gap-3 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full glow-dot animate-pulse" />
              <span className="font-mono-brand text-xs uppercase tracking-[0.15em] text-green-400">
                building in public
              </span>
            </div>

            <h2 className="font-display text-3xl md:text-5xl font-bold text-salt mb-4 tracking-tight">
              Our first app is{' '}
              <span className="gradient-text-signal">cooking.</span>
            </h2>

            <p className="text-mineral text-lg mb-10 max-w-xl leading-relaxed">
              We're keeping it small, keeping it sharp, and taking our time to get it right.
              Drop your email to be first to know when we launch.
            </p>

            {isSubmitted ? (
              <div className="success-message flex items-center gap-4 py-4">
                <div className="w-12 h-12 rounded-full bg-green-400/10 flex items-center justify-center animate-bounce">
                  <Sparkles className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-salt font-display font-semibold text-lg">You're on the list!</p>
                  <p className="text-mineral text-sm">We'll reach out when it's time. Stay tuned.</p>
                </div>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mineral/50" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-13 bg-white/[0.03] border-white/[0.08] text-salt placeholder:text-mineral/40 focus:border-signal/50 focus:ring-signal/20 rounded-xl transition-all duration-300 focus:shadow-[0_0_20px_rgba(74,144,217,0.1)]"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-13 px-8 bg-signal hover:bg-signal/90 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-[0_0_30px_rgba(74,144,217,0.25)] active:scale-95 group cursor-pointer"
                >
                  Get notified
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Footer ─── */
const Footer = () => {
  const footerRef = useRef<HTMLElement>(null);
  const bigTextRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Big brand text with horizontal slide
      gsap.fromTo(
        bigTextRef.current,
        { x: -100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      gsap.fromTo(
        '.footer-animate',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="py-16 md:py-24 px-6 md:px-10 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto">
        {/* Big brand text */}
        <div className="mb-16" style={{ opacity: 0 }}>
          <h2
            ref={bigTextRef}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white/[0.04] select-none"
          >
            saltlab.
          </h2>
        </div>

        <div className="footer-animate grid md:grid-cols-3 gap-10 mb-16" style={{ opacity: 0 }}>
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/saltlab-logo.png"
                alt="Saltlab"
                className="w-6 h-6 invert brightness-200 contrast-200"
                style={{ mixBlendMode: 'screen' }}
              />
              <span className="font-display font-semibold text-salt">saltlab</span>
            </div>
            <p className="text-mineral text-sm leading-relaxed">
              Small apps. Sharp purpose.
              <br />
              An indie AI utility studio.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-mono-brand text-[10px] uppercase tracking-[0.2em] text-signal mb-4">
              Navigate
            </p>
            <div className="space-y-3">
              {['about', 'philosophy', 'status'].map((link) => (
                <a
                  key={link}
                  href={`#${link}`}
                  className="block text-sm text-mineral hover:text-salt hover:translate-x-1 transition-all duration-300"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="font-mono-brand text-[10px] uppercase tracking-[0.2em] text-signal mb-4">
              Connect
            </p>
            <a
              href="mailto:hello@saltlab.app"
              className="inline-flex items-center gap-2 text-sm text-mineral hover:text-salt transition-colors duration-300 group"
            >
              <Mail className="w-4 h-4" />
              hello@saltlab.app
              <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-animate hr-gradient mb-6" style={{ opacity: 0 }} />
        <div className="footer-animate flex flex-col sm:flex-row justify-between items-center gap-4" style={{ opacity: 0 }}>
          <p className="text-xs text-mineral/40">
            &copy; {new Date().getFullYear()} Saltlab. All rights reserved.
          </p>
          <p className="font-mono-brand text-[10px] text-mineral/30 tracking-wider">
            built with obsession from india
          </p>
        </div>
      </div>
    </footer>
  );
};

/* ─── Main App ─── */
function App() {
  useEffect(() => {
    ScrollTrigger.refresh();
  }, []);

  return (
    <main className="min-h-screen bg-[#0E0E0E] text-salt overflow-x-hidden md:cursor-none">
      <div className="grain-overlay" />
      <CustomCursor />
      <ScrollProgress />
      <Navbar />
      <Hero />
      <Marquee />
      <About />
      <Highlights />
      <Philosophy />
      <Status />
      <Footer />
    </main>
  );
}

export default App;
