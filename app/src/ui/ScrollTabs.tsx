import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import {
  edgesOf,
  fadeMask,
  keepEdges,
  pageLeft,
  revealLeft,
  type Edges,
  type ScrollBox,
} from '../app/scrollTabs';
import { tabKeys } from '../app/tabs';
import type { T } from '../i18n/i18n';
import { Icon } from './Icon';
import { Steady } from './Steady';

export type ScrollTabsLook = 'underline' | 'pill';

export interface ScrollTab<V extends string> {
  value: V;
  label: string;
}

export interface ScrollTabsProps<V extends string> {
  t: T;
  /** Names the tabs' ids, `<prefix>-tab-<value>`, and the hooks `<prefix>-tabs` and `<prefix>-tab`. */
  prefix: string;
  tabs: readonly ScrollTab<V>[];
  value: V;
  onChange: (v: V) => void;
  /** The id of the panel each tab controls. */
  controls: (v: V) => string;
  look: ScrollTabsLook;
  /** The tab list's name, or the id of the element that names it. */
  label?: string;
  labelledBy?: string;
}

const FADE_PX = 32;
const NONE: Edges = { start: false, end: false };

const LOOKS: Record<ScrollTabsLook, { frame: string; row: string; tab: string }> = {
  underline: {
    frame: '',
    row: 'border-b border-rule',
    tab: '-mb-px border-0 border-b-3 border-solid border-transparent px-3 py-2 text-[1.05rem] font-bold text-muted aria-selected:border-accent aria-selected:text-ink focus-visible:outline-offset-[-2px] max-sm:px-2 max-sm:text-[0.92rem]',
  },
  pill: {
    frame: 'w-fit max-w-full rounded-lg bg-surface-2',
    row: 'p-[3px]',
    tab: 'min-h-8 rounded-md border-0 px-2.5 py-[5px] text-[0.86rem] leading-[22px] aria-selected:bg-surface aria-selected:font-bold aria-selected:text-ink aria-selected:ring-1 aria-selected:ring-rule focus-visible:outline-offset-0',
  },
};

const boxOf = (el: HTMLElement): ScrollBox => ({
  left: el.scrollLeft,
  width: el.clientWidth,
  scrollWidth: el.scrollWidth,
});

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const scrollRow = (el: HTMLElement, left: number, smooth: boolean): void =>
  el.scrollTo({ left, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });

/** Which edges of the row have more past them, measured again on each scroll and resize. */
const measure = (el: HTMLElement | null, set: Dispatch<SetStateAction<Edges>>): void => {
  if (el) {
    set((before) => keepEdges(before, edgesOf(boxOf(el))));
  }
};

const useEdges = (row: RefObject<HTMLDivElement | null>) => {
  const [edges, setEdges] = useState(NONE);
  useEffect(() => {
    const el = row.current;
    // An observer reports each element's size as soon as it observes it: the first measure.
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => measure(el, setEdges));
    [el, el?.firstElementChild].forEach((node) => node && observer?.observe(node));
    return () => observer?.disconnect();
  }, [row]);
  return [edges, () => measure(row.current, setEdges)] as const;
};

/** Scrolls the tab `id` into sight each time it is chosen: at once on the first draw. */
const useReveal = (row: RefObject<HTMLDivElement | null>, id: string) => {
  const drawn = useRef(false);
  useEffect(() => {
    const el = row.current;
    const tab = document.getElementById(id);
    if (el && tab) {
      const item = { left: tab.offsetLeft, width: tab.offsetWidth };
      scrollRow(el, revealLeft(boxOf(el), item, FADE_PX), drawn.current);
    }
    drawn.current = true;
  }, [row, id]);
};

const Arrow = (p: {
  edge: 'start' | 'end';
  label: string;
  shown: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    tabIndex={-1}
    aria-label={p.label}
    data-edge={p.edge}
    hidden={!p.shown}
    onClick={p.onClick}
    className={`scroll-arrow absolute top-1/2 z-1 hidden size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-surface p-0 text-ink shadow-sm ring-1 ring-rule hover:bg-accent-soft [@media(hover:hover)]:flex ${p.edge === 'start' ? 'left-0.5' : 'right-0.5'}`}
  >
    <Icon name={p.edge === 'start' ? 'back' : 'more'} size={16} />
  </button>
);

/**
 * Tabs on one row that scrolls sideways: the edge with more past it fades, an arrow at each end
 * scrolls a page on a pointer device, and the chosen tab is kept in sight.
 */
export const ScrollTabs = <V extends string>(p: ScrollTabsProps<V>) => {
  const row = useRef<HTMLDivElement>(null);
  const [edges, measure] = useEdges(row);
  const idOf = (v: V) => `${p.prefix}-tab-${v}`;
  useReveal(row, idOf(p.value));
  const values = p.tabs.map((tab) => tab.value);
  const page = (direction: 1 | -1) => {
    const el = row.current;
    if (el) {
      scrollRow(el, pageLeft(boxOf(el), direction), true);
    }
  };
  const mask = fadeMask(edges, `${FADE_PX}px`);
  const look = LOOKS[p.look];
  return (
    <div
      className={`scroll-tabs relative min-w-0 ${look.frame}`}
      data-look={p.look}
      data-more-start={edges.start ? '' : undefined}
      data-more-end={edges.end ? '' : undefined}
    >
      <div
        ref={row}
        className={`scroll-row relative overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${look.row}`}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        onScroll={measure}
      >
        <div
          className={`${p.prefix}-tabs flex w-max gap-1`}
          role="tablist"
          aria-label={p.label}
          aria-labelledby={p.labelledBy}
        >
          {p.tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              id={idOf(tab.value)}
              data-value={tab.value}
              className={`${p.prefix}-tab shrink-0 cursor-pointer whitespace-nowrap bg-transparent ${look.tab}`}
              aria-controls={p.controls(tab.value)}
              aria-selected={tab.value === p.value}
              tabIndex={tab.value === p.value ? 0 : -1}
              onClick={() => p.onChange(tab.value)}
              onKeyDown={(e: KeyboardEvent) =>
                tabKeys(values, tab.value, p.onChange, idOf)(e.nativeEvent)
              }
            >
              <Steady text={tab.label} />
            </button>
          ))}
        </div>
      </div>
      <Arrow
        edge="start"
        label={p.t('scrollTabs.back')}
        shown={edges.start}
        onClick={() => page(-1)}
      />
      <Arrow edge="end" label={p.t('scrollTabs.more')} shown={edges.end} onClick={() => page(1)} />
    </div>
  );
};
