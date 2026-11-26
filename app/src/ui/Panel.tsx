import { useState } from 'react';
import { orderKey, panelOrder, type CauseSection, type PanelGroup } from '../app/panelOrder';
import { valueAt } from '../app/summaryModel';
import { HORIZONS, type Horizon } from '../app/url';
import type { Worth, WorthId } from '../app/worth';
import type { Climate, LeverCause } from '../data/types';
import { formatTemperature } from '../i18n/format';
import { DIET_CAUSE, LEVER_CAUSES, PANEL_MODULES, type LeverId } from '../levers/registry';
import type { Options } from '../model/api';
import { DietGroup, type PanelProps } from './DietGroup';
import { Info } from './Info';
import { LeverGroup } from './LeverGroup';
import { OptionsGroup } from './OptionsGroup';
import { QuickPair } from './QuickPair';
import { Segmented } from './Segmented';
import { Slider } from './Slider';
import { PeopleControl } from './PeopleControl';
import type { PopulationData } from '../levers/population/data';
import { IconTabs } from './IconTabs';
import { MenuHead } from './MenuHead';
import { Steady } from './Steady';
import { changedOptions } from '../controls/panelModel';
import type { T } from '../i18n/i18n';

/** The diet, then each lever module, each under the cause of warming it mainly acts on. */
const GROUPS: readonly PanelGroup[] = [
  { id: 'diet', cause: DIET_CAUSE, worth: 'diet' },
  ...PANEL_MODULES.map((m) => ({
    id: m.id,
    cause: m.cause ?? DIET_CAUSE,
    worth: `family:${m.id}`,
  })),
];

/** The warming each cause causes at the horizon, in the chosen scenario. */
const causeSizes = (climate: Climate, options: Options, horizon: Horizon) => {
  const attribution = climate.attribution[options.ssp];
  return Object.fromEntries(
    LEVER_CAUSES.map((c) => [
      c,
      valueAt(attribution[c].years, attribution[c].median, Number(horizon)) ?? 0,
    ]),
  ) as Record<LeverCause, number>;
};

interface Ordered {
  order: CauseSection[];
  /** The key the order was last settled for, once every figure was known; null before. */
  settledFor: string | null;
  values: ReadonlyMap<WorthId, Worth>;
  key: string;
}

/** The order once the figures or the key change: kept while settled for this key. */
const nextOrder = (
  ordered: Ordered,
  sizes: Record<LeverCause, number>,
  values: ReadonlyMap<WorthId, Worth>,
  horizon: Horizon,
  key: string,
): Ordered => {
  const known = GROUPS.every((g) => values.has(g.worth));
  const settled = ordered.settledFor === key || (!known && ordered.settledFor !== null);
  return {
    order: settled
      ? ordered.order
      : panelOrder(GROUPS, sizes, (w) => (known ? values.get(w)?.[horizon] : undefined)),
    settledFor: !settled && known ? key : ordered.settledFor,
    values,
    key,
  };
};

/**
 * The groups under their causes, biggest first. The order moves once every group's worth is
 * known for the current options, horizon and data, and only then: a slider never reorders it.
 */
const usePanelOrder = (
  sizes: Record<LeverCause, number>,
  values: ReadonlyMap<WorthId, Worth>,
  horizon: Horizon,
  key: string,
): CauseSection[] => {
  const [ordered, setOrdered] = useState<Ordered>(() => ({
    order: panelOrder(GROUPS, sizes, () => undefined),
    settledFor: null,
    values,
    key,
  }));
  if (ordered.values !== values || ordered.key !== key) {
    setOrdered(nextOrder(ordered, sizes, values, horizon, key));
  }
  return ordered.order;
};

export interface SidePanelProps extends PanelProps {
  options: Options;
  horizon: Horizon;
  rampEnd: number;
  currentYear: number;
  climate: Climate;
  values: ReadonlyMap<WorthId, Worth>;
  /** Goes up each time a deferred lever file arrives. */
  dataVersion: number;
  available: (id: LeverId) => boolean;
  /** The UN's projections, which mark the people-on-Earth control. */
  population?: PopulationData;
  setOptions: (change: (o: Options) => Options) => void;
  setHorizon: (horizon: Horizon) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

/**
 * The year every lever, the diet included, is fully in place: they ramp in linearly from the
 * current year to it. At the top of the panel, as it applies to all of them.
 */
const Timing = ({ t, scenario, setScenario, currentYear }: SidePanelProps) => (
  <div className="timing" data-control="timing">
    <Slider
      id="rampEnd"
      label={t('controls.rampEnd')}
      min={Math.min(currentYear + 1, 2050)}
      max={2050}
      step={1}
      value={scenario.rampEnd}
      format={String}
      marks={[2030, 2035, 2040, 2050]
        .filter((y) => y > currentYear)
        .map((y) => ({ value: y, label: String(y) }))}
      info={
        <Info
          label={t('controls.info', { name: t('controls.rampEnd') })}
          text={t('controls.rampHint')}
        />
      }
      onChange={(rampEnd) => setScenario((s) => ({ ...s, rampEnd }))}
    />
  </div>
);

const Cause = ({
  props,
  cause,
  ids,
  size,
}: {
  props: SidePanelProps;
  cause: LeverCause;
  ids: string[];
  size: number;
}) => {
  const { t, locale, horizon, scenario, setScenario } = props;
  const name = t(`link.causes.${cause}`);
  return (
    <section className="cause-section mt-2.5" data-cause={cause} aria-label={name}>
      <div className="cause-head flex items-start justify-between gap-2">
        <h3 className="cause-heading m-0 mb-0.5 flex min-w-0 flex-auto flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem] font-bold">
          <span className={`key key-cause-${cause}`} aria-hidden="true" />
          <span className="min-w-0 flex-[1_1_0]">{name}</span>
          <span className="cause-meta basis-full text-[0.78rem] font-normal text-muted">
            {t('levers.causeWarming', { value: formatTemperature(locale, size, 2), year: horizon })}
          </span>
        </h3>
        {ids.length > 0 && (
          <QuickPair
            ids={ids}
            scope={cause}
            locale={locale}
            scenario={scenario}
            name={(value) => t('quick.cause', { name, value })}
            setScenario={setScenario}
            className="-mt-0.5"
          />
        )}
      </div>
      <div className="cause-groups">
        {ids.map((id) => {
          const module = PANEL_MODULES.find((m) => m.id === id);
          return module ? (
            <LeverGroup key={id} {...props} module={module} available={props.available} />
          ) : (
            <DietGroup key={id} {...props} />
          );
        })}
      </div>
    </section>
  );
};

type PanelView = 'levers' | 'options';

/** The panel's two views, the Options tab counting the options changed from their defaults. */
const PanelTabs = ({
  t,
  options,
  view,
  setView,
}: {
  t: T;
  options: Options;
  view: PanelView;
  setView: (v: PanelView) => void;
}) => {
  const count = changedOptions(options);
  return (
    <IconTabs<PanelView>
      wide
      label={t('panel.label')}
      prefix="panel"
      tabs={[
        { value: 'levers', icon: 'levers', label: <Steady text={t('panel.levers')} /> },
        {
          value: 'options',
          icon: 'options',
          label: (
            <>
              <Steady text={t('options.title')} />
              {count > 0 && (
                <span
                  className="rounded-full bg-accent px-1.5 text-[0.72rem] leading-[1.4] font-bold text-accent-ink"
                  title={t('options.changed', { count })}
                >
                  {count}
                </span>
              )}
            </>
          ),
        },
      ]}
      value={view}
      onChange={setView}
    />
  );
};

/** The panel beside the charts: when levers are in place, the levers by cause, the options. */
export const SidePanel = (props: SidePanelProps) => {
  const { t, locale, options, horizon, scenario, setScenario, climate, values } = props;
  const [view, setView] = useState<PanelView>('levers');
  const sizes = causeSizes(climate, options, horizon);
  const order = usePanelOrder(
    sizes,
    values,
    horizon,
    orderKey(options, horizon, props.dataVersion),
  );
  return (
    <aside
      className={`panel lg:[grid-area:panel] sticky top-[calc(var(--header-h)+20px)] grid max-h-[calc(100dvh-var(--header-h)-32px)] gap-3 overflow-y-auto rounded-card border border-rule bg-surface p-4 max-lg:static max-lg:max-h-none ${props.open ? '' : 'lg:p-1.5'}`}
      aria-label={t('explore.panel')}
    >
      <MenuHead
        t={t}
        id="panel"
        open={props.open}
        setOpen={props.setOpen}
        controls="panel-content"
        side="left"
        rail="lg:hidden"
        title={
          <h2 className="panel-heading m-0 text-[0.78rem] tracking-[0.06em] text-muted uppercase">
            {t('explore.panel')}
          </h2>
        }
      />
      <div className={`panel-horizon ${props.open ? '' : 'lg:hidden'}`}>
        <Segmented<Horizon>
          compact
          name="horizon"
          legend={t('controls.horizon')}
          options={HORIZONS.map((v) => ({ value: v, label: v }))}
          value={horizon}
          info={
            <Info
              label={t('controls.info', { name: t('controls.horizon') })}
              text={t('controls.horizonHint')}
            />
          }
          onChange={props.setHorizon}
        />
      </div>
      <div id="panel-content" className="grid gap-[18px]" hidden={!props.open}>
        <PanelTabs t={t} options={options} view={view} setView={setView} />
        <div
          role="tabpanel"
          id="panel-panel-levers"
          aria-labelledby="panel-tab-levers"
          hidden={view !== 'levers'}
          className="grid gap-[18px]"
        >
          <div className="time-settings grid gap-3.5 border-b border-rule pb-3">
            <Timing {...props} />
          </div>
          {props.population && (
            <PeopleControl
              t={t}
              locale={locale}
              options={options}
              population={props.population}
              year={scenario.rampEnd}
              setOptions={props.setOptions}
            />
          )}
          <section className="levers grid gap-0" aria-labelledby="levers-title">
            <div className="levers-head mt-1.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <h2
                  id="levers-title"
                  className="panel-heading m-0 text-[0.78rem] tracking-[0.06em] text-muted uppercase"
                >
                  {t('levers.title')}
                </h2>
                <Info
                  label={t('controls.info', { name: t('levers.title') })}
                  text={[t('levers.intro'), t('worth.legend', { year: horizon })]}
                />
              </span>
              <span className="quick-all inline-flex items-center gap-1.5">
                <span className="quick-label text-[0.72rem] text-muted" aria-hidden="true">
                  {t('quick.allLabel')}
                </span>
                <QuickPair
                  ids={GROUPS.map((g) => g.id)}
                  scope="all"
                  locale={locale}
                  scenario={scenario}
                  name={(value) => t('quick.all', { value })}
                  setScenario={setScenario}
                />
              </span>
            </div>
            <div className="cause-sections">
              {order.map(({ cause, groups }) => (
                <Cause key={cause} props={props} cause={cause} ids={groups} size={sizes[cause]} />
              ))}
            </div>
          </section>
        </div>
        <div
          role="tabpanel"
          id="panel-panel-options"
          aria-labelledby="panel-tab-options"
          hidden={view !== 'options'}
        >
          <OptionsGroup t={t} options={options} setOptions={props.setOptions} />
        </div>
      </div>
    </aside>
  );
};
