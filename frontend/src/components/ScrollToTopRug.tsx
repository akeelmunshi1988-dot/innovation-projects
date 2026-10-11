import { useEffect, useRef, useState } from 'react';

const SHOW_AFTER_PX = 700;
const ROLL_UP_MS = 550;
// Rug panel inside the 60×90 button: 48px wide at the rug's 40:54 drawing ratio.
// Its height is also the distance the roll travels.
const RUG_HEIGHT = 65;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Storefront back-to-top button drawn as a small rug: it unrolls into view
 * once the visitor scrolls down, and rolls back up when clicked while the
 * page scrolls to the top. Reduced-motion visitors get a static rug and an
 * instant jump.
 */
export default function ScrollToTopRug({ raised = false }: { raised?: boolean }) {
  const [visible, setVisible] = useState(false);
  // Drives the roll/unroll: true = flat rug, false = rolled up at the top.
  const [unrolled, setUnrolled] = useState(false);
  const rollingUp = useRef(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const past = window.scrollY > SHOW_AFTER_PX;
      if (past && !rollingUp.current) setVisible(true);
      // While rolling up, stay on screen until the animation finishes (see backToTop).
      if (!past && !rollingUp.current) {
        setVisible(false);
        setUnrolled(false);
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Unroll one frame after mounting so the rolled state paints first and the transition runs.
  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setUnrolled(true)));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  if (!visible) return null;

  const backToTop = () => {
    const instant = reducedMotion();
    rollingUp.current = true;
    setUnrolled(false);
    window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
    window.setTimeout(() => {
      rollingUp.current = false;
      if (window.scrollY <= SHOW_AFTER_PX) setVisible(false);
    }, instant ? 0 : ROLL_UP_MS + 150);
  };

  const ease = 'cubic-bezier(0.22, 0.8, 0.3, 1)';
  const duration = unrolled ? 750 : ROLL_UP_MS;

  return (
    <button
      type="button"
      onClick={backToTop}
      aria-label="Back to top"
      title="Back to top"
      className={`group fixed right-6 z-40 h-[90px] w-[60px] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-showroom-charcoal motion-reduce:transition-none ${
        raised ? 'bottom-24' : 'bottom-6'
      }`}
    >
      {/* Soft shadow under the rug */}
      <span
        aria-hidden="true"
        className="absolute inset-x-2 bottom-0 h-2 rounded-full bg-showroom-charcoal/15 blur-[3px] transition-opacity motion-reduce:transition-none"
        style={{ opacity: unrolled ? 1 : 0, transitionDuration: `${duration}ms` }}
      />

      {/* The flat rug, revealed top-down as the roll travels down */}
      <span
        aria-hidden="true"
        className="absolute inset-x-1.5 top-3 overflow-hidden motion-reduce:!transition-none"
        style={{
          height: RUG_HEIGHT,
          clipPath: unrolled ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
          transition: `clip-path ${duration}ms ${ease}`,
        }}
      >
        {/* Drawn after the Hand-Knotted Wool Checkerboard Carpet: taupe/cream checks, braided tassels both ends. */}
        <svg viewBox="0 0 40 54" className="h-full w-full" aria-hidden="true">
          <defs>
            <pattern id="drc-top-checks" x="5" y="5" width="10" height="9.78" patternUnits="userSpaceOnUse">
              <rect width="10" height="9.78" fill="#F1EADC" />
              <rect width="5" height="4.89" fill="#9C8366" />
              <rect x="5" y="4.89" width="5" height="4.89" fill="#9C8366" />
            </pattern>
            {/* Roughens the check edges like a shaggy wool pile */}
            <filter id="drc-top-pile" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" />
            </filter>
            <linearGradient id="drc-top-sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#3b2f22" stopOpacity="0.12" />
            </linearGradient>
          </defs>

          {/* braided tassels: top ones point up, bottom ones down */}
          {[6.5, 10.5, 14.5, 18.5, 21.5, 25.5, 29.5, 33.5].map((x) => (
            <g key={x} strokeLinecap="round">
              <path d={`M${x} 5 l0.45 -0.8 l-0.9 -0.8 l0.9 -0.8`} fill="none" stroke="#b9a184" strokeWidth="0.75" />
              <path d={`M${x} 2.6 l-0.9 -2 M${x} 2.6 l0 -2.2 M${x} 2.6 l0.9 -2`} stroke="#c8b497" strokeWidth="0.55" />
              <path d={`M${x} 49 l0.45 0.8 l-0.9 0.8 l0.9 0.8`} fill="none" stroke="#b9a184" strokeWidth="0.75" />
              <path d={`M${x} 51.4 l-0.9 2 M${x} 51.4 l0 2.2 M${x} 51.4 l0.9 2`} stroke="#c8b497" strokeWidth="0.55" />
            </g>
          ))}

          {/* the rug body */}
          <rect x="5" y="5" width="30" height="44" fill="url(#drc-top-checks)" filter="url(#drc-top-pile)" />
          <rect x="5" y="5" width="30" height="44" fill="url(#drc-top-sheen)" />
        </svg>

        {/* up arrow in a cream roundel at the rug's centre, fades in once the rug is open */}
        <span
          className="absolute inset-x-0 top-[20px] flex justify-center transition-all duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none"
          style={{ opacity: unrolled ? 1 : 0, transitionDelay: unrolled ? `${duration - 150}ms` : '0ms' }}
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#F8F4EC] text-[#5f4d3b] shadow-[0_1px_3px_rgba(33,31,29,0.25)] ring-1 ring-[#9C8366]">
            <svg viewBox="0 0 16 16" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
            </svg>
          </span>
        </span>
      </span>

      {/* The roll: the same checkerboard rolled up — sits at the top while rolled,
          travels to the bottom edge and thins out as it unrolls */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0.5 top-1 h-4 rounded-full border border-[#8a7258] motion-reduce:!transition-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 45%, rgba(59,47,34,0.35) 100%), repeating-linear-gradient(90deg, #9C8366 0 4px, #F1EADC 4px 8px)',
          transform: unrolled ? `translateY(${RUG_HEIGHT - 9}px) scaleY(0.35)` : 'translateY(0) scaleY(1)',
          opacity: unrolled ? 0 : 1,
          transition: `transform ${duration}ms ${ease}, opacity ${unrolled ? 250 : 150}ms ease ${unrolled ? duration - 250 : 0}ms`,
        }}
      >
        {/* spiral ends of the roll */}
        <span className="absolute -left-px top-1/2 h-4 w-2.5 -translate-y-1/2 rounded-full border border-[#8a7258] bg-[radial-gradient(circle,#F1EADC_22%,#9C8366_28%,#9C8366_42%,#F1EADC_48%,#F1EADC_62%,#9C8366_68%)]" />
        <span className="absolute -right-px top-1/2 h-4 w-2.5 -translate-y-1/2 rounded-full border border-[#8a7258] bg-[radial-gradient(circle,#F1EADC_22%,#9C8366_28%,#9C8366_42%,#F1EADC_48%,#F1EADC_62%,#9C8366_68%)]" />
      </span>
    </button>
  );
}
