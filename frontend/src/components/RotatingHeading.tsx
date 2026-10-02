import { useEffect, useState } from 'react';

interface RotatingHeadingProps {
  titles: string[];
  className?: string;
  style?: React.CSSProperties;
  /** How long each title stays fully visible. */
  holdMs?: number;
  /** Length of the slow fade-out; the next title then fades in over the same time. */
  fadeMs?: number;
}

/**
 * A heading that cycles through `titles` on its own — no manual controls. One
 * title at a time: the current one slowly fades away, and only then does the
 * next fade in. Every title sits in the same grid cell, so the heading's height
 * is always that of the tallest title and the page never shifts as they change.
 * Visitors who prefer reduced motion just see the first title.
 */
export default function RotatingHeading({ titles, className, style, holdMs = 2000, fadeMs = 1200 }: RotatingHeadingProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIndex(0);
    setVisible(true);
    if (titles.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let timer: number;
    const fadeOut = () => {
      setVisible(false);
      timer = window.setTimeout(fadeIn, fadeMs);
    };
    const fadeIn = () => {
      setIndex((current) => (current + 1) % titles.length);
      setVisible(true);
      timer = window.setTimeout(fadeOut, fadeMs + holdMs);
    };
    timer = window.setTimeout(fadeOut, holdMs);
    return () => window.clearTimeout(timer);
  }, [titles, holdMs, fadeMs]);

  return (
    <h2 className={`grid ${className ?? ''}`} style={style}>
      {titles.map((title, i) => {
        const shown = i === index && visible;
        return (
          <span
            key={`${i}-${title}`}
            aria-hidden={i !== index}
            className={`[grid-area:1/1] ease-in-out motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ transition: `opacity ${fadeMs}ms` }}
          >
            {title}
          </span>
        );
      })}
    </h2>
  );
}
