"use client";

import { useEffect, useRef } from "react";

/**
 * Плавне розкриття/згортання блоку невідомої наперед висоти.
 *
 * Анімуємо height у пікселях через Web Animations API: висоту заміряємо
 * (scrollHeight) в момент запуску, тож CSS-переходу нема від чого залежати.
 * Раніше тут була інтерполяція grid-template-rows (0fr -> 1fr) — вона дає той
 * самий вигляд, але змушує браузер перераховувати грід-розкладку кожен кадр,
 * і на сторінці з ~1800 рядків це помітно смикалось.
 *
 * Блок лишається в DOM до кінця анімації згортання — батько знімає його вже
 * по `onClosed`.
 */
export default function Collapsible({
  open,
  onOpened,
  onClosed,
  children,
}: {
  open: boolean;
  onOpened?: () => void;
  onClosed?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const running = useRef<Animation | null>(null);
  // Перший прохід — це поява блоку: стартуємо з нуля, а не з поточної висоти.
  const mountedOnce = useRef(false);
  const opened = useRef(onOpened);
  const closed = useRef(onClosed);

  useEffect(() => {
    opened.current = onOpened;
    closed.current = onClosed;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    running.current?.cancel();
    const from = mountedOnce.current ? el.getBoundingClientRect().height : 0;
    mountedOnce.current = true;
    const to = open ? el.scrollHeight : 0;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = el.animate(
      [
        { height: `${from}px`, opacity: from === 0 ? 0 : 1 },
        { height: `${to}px`, opacity: open ? 1 : 0 },
      ],
      {
        duration: reduce ? 0 : open ? 190 : 140,
        easing: open ? "cubic-bezier(0.2, 0.9, 0.3, 1)" : "cubic-bezier(0.4, 0, 1, 1)",
      }
    );
    running.current = animation;
    animation.onfinish = () => {
      running.current = null;
      // Без fill елемент повертається до власних стилів (height: auto), тож
      // розкритий блок далі вільно підлаштовується під вміст.
      if (open) opened.current?.();
      else closed.current?.();
    };

    return () => {
      animation.onfinish = null;
    };
  }, [open]);

  return (
    // contain обмежує перерахунок розкладки вмістом блоку, щоб анімація не
    // тягла за собою решту списку.
    <div ref={ref} style={{ overflow: "hidden", contain: "layout paint", willChange: "height" }}>
      {children}
    </div>
  );
}
