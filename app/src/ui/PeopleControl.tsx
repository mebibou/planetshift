import type { ReactNode } from 'react';
import { formatNumber } from '../i18n/format';
import type { T } from '../i18n/i18n';
import type { PopulationData } from '../levers/population/data';
import { PEOPLE_AXIS_MAX as MAX } from '../chart/populationArea';
import { BILLION, variantPeople } from '../levers/population/people';
import type { Options } from '../model/api';
import { Info } from './Info';
import { SLIDER_HEAD, SLIDER_LABEL, SLIDER_NAME, SLIDER_VALUE } from './classes';
import { Slider } from './Slider';

const TEXTS = 'levers.population.people';

const methodHref = (): string => {
  const query = new URLSearchParams(window.location.search);
  query.set('view', 'methodology');
  return `?${query}#method-options`;
};
const STEP = 0.1;
const MARKED = ['low', 'medium', 'high'] as const;

const hundredths = (v: number) => Math.round(v * 100) / 100;

export interface PeopleMark {
  value: number;
  variant: (typeof MARKED)[number];
}

/** The UN variants' populations in `year`, billions to two decimals, from the data. */
export const peopleMarks = (pop: PopulationData, year?: number): PeopleMark[] =>
  MARKED.map((variant) => ({
    value: hundredths(variantPeople(pop, variant, year) / BILLION),
    variant,
  }));

const markOf = (marks: readonly PeopleMark[], variant: PeopleMark['variant']): number =>
  marks.find((m) => m.variant === variant)?.value ?? 0;

/**
 * The value after a key: arrows a tenth of a billion to the next tenth, Page Up and Page Down to
 * the next mark (or end); undefined for the keys the input handles itself.
 */
export const peopleKey = (
  key: string,
  value: number,
  stops: readonly number[],
): number | undefined => {
  const up = stops.find((s) => s > value + 1e-9);
  const down = [...stops].reverse().find((s) => s < value - 1e-9);
  const moves: Record<string, number | undefined> = {
    ArrowUp: Math.floor(value / STEP + 1e-6) * STEP + STEP,
    ArrowRight: Math.floor(value / STEP + 1e-6) * STEP + STEP,
    ArrowDown: Math.ceil(value / STEP - 1e-6) * STEP - STEP,
    ArrowLeft: Math.ceil(value / STEP - 1e-6) * STEP - STEP,
    PageUp: up ?? value,
    PageDown: down ?? value,
  };
  const next = moves[key];
  return next === undefined ? undefined : hundredths(next);
};

const PeopleHead = (p: { own: boolean; label: string; info: ReactNode; text: string }) => (
  <div className={SLIDER_HEAD}>
    <span className={SLIDER_LABEL}>
      {p.own ? (
        <label htmlFor="people" className={SLIDER_NAME}>
          {p.label}
        </label>
      ) : (
        <span className={`slider-name ${SLIDER_NAME}`}>{p.label}</span>
      )}
      {p.info}
    </span>
    <output htmlFor={p.own ? 'people' : undefined} className={SLIDER_VALUE}>
      {p.text}
    </output>
  </div>
);

/**
 * People on Earth by the year every lever is in place, from none to 14 billion, marked at the UN's low, medium and high
 * projections: a thought experiment in place of the UN projection.
 */
export const PeopleControl = ({
  t,
  locale,
  options,
  population,
  year,
  setOptions,
}: {
  t: T;
  locale: string;
  options: Options;
  population: PopulationData;
  year: number;
  setOptions: (change: (o: Options) => Options) => void;
}) => {
  const marks = peopleMarks(population, year);
  const [medium, high] = [markOf(marks, 'medium'), markOf(marks, 'high')];
  const own = options.people !== undefined;
  const value = options.people ?? medium;
  const format = (v: number) => t(`${TEXTS}.value`, { value: formatNumber(locale, v, 2) });
  const markName = (v: number) => {
    const mark = marks.find((m) => Math.abs(m.value - v) < 1e-9);
    return mark ? t(`${TEXTS}.marks.${mark.variant}`) : null;
  };
  const label = t(`${TEXTS}.label`, { year });
  const info = (
    <Info
      label={t('controls.info', { name: label })}
      text={t(`${TEXTS}.hint`)}
      more={{ href: methodHref(), text: t(`${TEXTS}.more`) }}
    />
  );
  return high > 0 ? (
    <div className="people-control" data-control="people">
      <PeopleHead
        own={own}
        label={label}
        info={info}
        text={format(own ? value : markOf(marks, options.population as PeopleMark['variant']))}
      />
      <label className="people-follow mt-1.5 mb-1 flex items-center gap-2 text-[0.92rem]">
        <input
          className="accent-accent"
          type="checkbox"
          checked={!own}
          onChange={(e) =>
            setOptions((o) => ({ ...o, people: e.target.checked ? undefined : medium }))
          }
        />
        {t(`${TEXTS}.follow`)}
      </label>
      {own && (
        <>
          <Slider
            id="people"
            label={label}
            min={0}
            max={MAX}
            step={0.01}
            value={value}
            format={format}
            valueText={(v) => [format(v), markName(v)].filter(Boolean).join(', ')}
            keyValue={(key, v) => peopleKey(key, v, [0, ...marks.map((m) => m.value), MAX])}
            marks={marks.map((m) => ({ value: m.value, label: '' }))}
            nativeTicks={false}
            headless
            info={info}
            onChange={(people) => setOptions((o) => ({ ...o, people: hundredths(people) }))}
          />
          <div
            className="people-marks mt-1.5 flex flex-wrap gap-1"
            role="group"
            aria-label={t(`${TEXTS}.marksLabel`, { year })}
          >
            {marks.map((m) => (
              <button
                key={m.variant}
                type="button"
                className="cursor-pointer rounded-full border border-rule bg-transparent px-2 py-0.5 text-[0.78rem] text-muted aria-pressed:border-accent aria-pressed:text-ink"
                aria-pressed={Math.abs(m.value - value) < 1e-9}
                onClick={() => setOptions((o) => ({ ...o, people: m.value }))}
              >
                {t(`${TEXTS}.marks.${m.variant}`)} {formatNumber(locale, m.value, 1)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  ) : null;
};
