import { h } from './dom';
import type { AppState, ViewContext } from './context';
import { optionsPanel } from '../controls/options';
import { scenarioPanel, timingControl } from '../controls/panel';
import { leverGroups } from '../controls/levers';
import { segmented } from '../controls/segmented';
import { paintWorth } from '../controls/group';
import { quickPair } from '../controls/quick';
import { avoidedChart } from '../chart/avoided';
import { causeView } from '../chart/cause';
import { populationChart } from '../chart/population';
import { RANGE_START, temperatureChart, type Range } from '../chart/temperature';
import { mapCard } from '../map/mapCard';
import type { Options, Scenario, ScenarioResult } from '../model/api';
import { runScenario } from '../model/run';
import { DIET_CAUSE, LEVER_CAUSES, leverAvailable } from '../levers/registry';
import type { LeverCause } from '../data/types';
import { formatTemperature } from '../i18n/format';
import { valueAt } from './summaryModel';
import { orderKey, panelOrder, type CauseSection, type PanelGroup } from './panelOrder';
import { CHARTS, HORIZONS, type ChartTab, type Horizon } from './url';
import { summary } from './summary';
import { worldPerCapita } from './summaryModel';
import { worthCache, type Worth } from './worth';
import { dataFolder } from '../data/load';
import { chartDownload } from './downloadPanel';

export interface ExploreView {
  el: HTMLElement;
  sync: (state: AppState) => void;
  show: (result: ScenarioResult | null, state: AppState) => void;
}

export const exploreView = (ctx: ViewContext): ExploreView => {
  const { t, locale, data, state } = ctx;
  const panelContext = {
    t,
    locale,
    currentYear: ctx.currentYear,
    scenario: state.scenario,
    setScenario: ctx.setScenario,
  };
  const panel = scenarioPanel(panelContext);
  const timing = timingControl(panelContext);
  const levers = leverGroups({
    t,
    locale,
    scenario: state.scenario,
    available: (id) => leverAvailable(data, id),
    setScenario: ctx.setScenario,
  });
  const options = optionsPanel(t, state.options, ctx.setOptions);
  const map = mapCard({
    t,
    locale,
    lang: ctx.lang,
    world: ctx.world,
    countries: data.countries,
    intensities: data.intensities,
    climate: data.climate,
    meta: data.meta,
    currentYear: ctx.currentYear,
    folder: dataFolder(location.search),
    files: __DATA_FILES__[dataFolder(location.search)] ?? [],
    ui: state.ui,
    setUi: ctx.setUi,
  });
  const strip = summary(t, locale, ctx.currentYear);
  const chart = temperatureChart(t, locale, ctx.currentYear);
  const avoided = avoidedChart(t, locale, ctx.currentYear);
  const cause = causeView(t, locale, ctx.currentYear);
  const people = populationChart(t, locale, ctx.currentYear);
  chart.slot.append(people.el);
  let range: Range = 'full';
  let last: { result: ScenarioResult | null; state: AppState } = { result: null, state };
  const endOf = (s: AppState) => Number(s.ui.horizon);
  const drawCharts = () => {
    const end = endOf(last.state);
    const { ssp, temperature } = last.state.options;
    if (last.state.ui.chart === 'cause')
      cause.update(last.result, data.climate, { ssp, temperature, from: RANGE_START[range], end });
    if (!last.result) return;
    if (last.state.ui.chart === 'temperature') {
      chart.update(last.result, range, end, data.climate.naturalOnly, data.enso);
      people.update(last.result, range, end);
    } else if (last.state.ui.chart === 'avoided') avoided.update(last.result, end);
  };
  const rangeSwitch = segmented<Range>({
    name: 'range',
    legend: t('chart.range'),
    options: (['full', 'recent'] as const).map((v) => ({
      value: v,
      label: t(`chart.ranges.${v}`),
    })),
    value: range,
    onChange: (r) => {
      range = r;
      drawCharts();
    },
  });
  const horizonSwitch = segmented<Horizon>({
    name: 'horizon',
    legend: t('charts.horizon'),
    options: HORIZONS.map((v) => ({ value: v, label: v })),
    value: state.ui.horizon,
    onChange: (horizon) => ctx.setUi((u) => ({ ...u, horizon })),
  });
  const tabs = CHARTS.map((tab) =>
    h(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: `chart-tab-${tab}`,
        class: 'chart-tab',
        'aria-controls': `chart-panel-${tab}`,
        onclick: () => ctx.setUi((u) => ({ ...u, chart: tab })),
      },
      t(`charts.tabs.${tab}`),
    ),
  );
  const panels: Record<ChartTab, HTMLElement> = {
    temperature: h(
      'div',
      {
        role: 'tabpanel',
        id: 'chart-panel-temperature',
        'aria-labelledby': 'chart-tab-temperature',
      },
      chart.el,
      h(
        'button',
        {
          type: 'button',
          class: 'link-button see-causes',
          'aria-controls': 'chart-panel-cause',
          onclick: () => ctx.setUi((u) => ({ ...u, chart: 'cause' })),
        },
        t('charts.seeCauses'),
      ),
    ),
    avoided: h(
      'div',
      { role: 'tabpanel', id: 'chart-panel-avoided', 'aria-labelledby': 'chart-tab-avoided' },
      avoided.el,
    ),
    cause: h(
      'div',
      { role: 'tabpanel', id: 'chart-panel-cause', 'aria-labelledby': 'chart-tab-cause' },
      cause.el,
    ),
  };
  const showTab = (s: AppState) => {
    tabs.forEach((tab, i) => {
      const selected = CHARTS[i] === s.ui.chart;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    CHARTS.forEach((c) => (panels[c].hidden = c !== s.ui.chart));
    rangeSwitch.el.hidden = s.ui.chart === 'avoided';
    horizonSwitch.set(s.ui.horizon);
  };
  const error = h('p', { class: 'run-error', role: 'alert', hidden: true });
  const worthLegend = h('p', { class: 'hint worth-legend' });
  const groups: (PanelGroup & { el: HTMLElement })[] = [
    { id: 'diet', cause: DIET_CAUSE, worth: 'diet', el: panel.el },
    ...levers.groups.map(({ module, el }) => ({
      id: module.id,
      cause: module.cause ?? DIET_CAUSE,
      worth: `family:${module.id}`,
      el,
    })),
  ];
  const quickOf = (scope: string, ids: readonly string[], name: (value: string) => string) =>
    quickPair({ ids, scope, locale, name, setScenario: ctx.setScenario });
  const sections = new Map(
    LEVER_CAUSES.map((cause) => {
      const meta = h('span', { class: 'cause-meta' });
      const body = h('div', { class: 'cause-groups' });
      const name = t(`link.causes.${cause}`);
      const ids = groups.filter((g) => g.cause === cause).map((g) => g.id);
      const quick = quickOf(cause, ids, (value) => t('quick.cause', { name, value }));
      const el = h(
        'section',
        { class: 'cause-section', 'data-cause': cause, 'aria-label': name },
        h(
          'div',
          { class: 'cause-head' },
          h(
            'h3',
            { class: 'cause-heading' },
            h('span', { class: `key key-cause-${cause}`, 'aria-hidden': 'true' }),
            h('span', {}, name),
            meta,
          ),
          ids.length > 0 ? quick.el : null,
        ),
        body,
      );
      return [cause, { el, body, meta, quick }];
    }),
  );
  const allQuick = quickOf(
    'all',
    groups.map((g) => g.id),
    (value) => t('quick.all', { value }),
  );
  const causeList = h('div', { class: 'cause-sections' });
  let arranged = '';
  const arrange = (order: readonly CauseSection[]) => {
    const key = JSON.stringify(order);
    if (key === arranged) return;
    arranged = key;
    causeList.replaceChildren(
      ...order.flatMap(({ cause, groups: ids }) => {
        const section = sections.get(cause);
        if (!section) return [];
        section.body.replaceChildren(
          ...ids.flatMap((id) => groups.find((g) => g.id === id)?.el ?? []),
        );
        return [section.el];
      }),
    );
  };
  const leversEl = h(
    'section',
    { class: 'levers', 'aria-labelledby': 'levers-title' },
    h(
      'div',
      { class: 'levers-head' },
      h('h2', { id: 'levers-title', class: 'panel-heading' }, t('levers.title')),
      h(
        'span',
        { class: 'quick-all' },
        h('span', { class: 'quick-label', 'aria-hidden': 'true' }, t('quick.allLabel')),
        allQuick.el,
      ),
    ),
    h('p', { class: 'hint' }, t('levers.intro')),
    causeList,
  );
  const aside = h(
    'aside',
    { class: 'panel', 'aria-label': t('explore.panel') },
    timing.el,
    worthLegend,
    leversEl,
    options.el,
  );
  const causeSize = (s: AppState): Record<LeverCause, number> => {
    const attribution = data.climate.attribution[s.options.ssp];
    const year = Number(s.ui.horizon);
    return Object.fromEntries(
      LEVER_CAUSES.map((c) => [c, valueAt(attribution[c].years, attribution[c].median, year) ?? 0]),
    ) as Record<LeverCause, number>;
  };
  /**
   * Puts the groups in order once every group's worth is known for the current options and
   * horizon, and only then: a slider never reorders the panel.
   */
  let orderedFor: string | null = null;
  const reorder = (s: AppState, values: ReadonlyMap<string, Worth>) => {
    const sizes = causeSize(s);
    sections.forEach(({ meta }, cause) => {
      meta.textContent = t('levers.causeWarming', {
        value: formatTemperature(locale, sizes[cause], 2),
        year: s.ui.horizon,
      });
    });
    const key = orderKey(s.options, s.ui.horizon, dataVersion);
    const known = groups.every((g) => values.has(g.worth));
    if (orderedFor === key || (!known && orderedFor !== null)) return;
    arrange(panelOrder(groups, sizes, (w) => (known ? values.get(w)?.[s.ui.horizon] : undefined)));
    if (known) orderedFor = key;
  };
  const paint = (values: ReadonlyMap<string, Worth>) => {
    paintWorth(aside, values, last.state.ui.horizon, t, locale);
    reorder(last.state, values);
  };
  /** What each lever is worth, on the data as loaded: a new cache once a deferred file arrives. */
  const worthOn = (current: typeof data) =>
    worthCache({
      run: (scenario: Scenario, options: Options) => {
        ctx.loadAll();
        try {
          const r = runScenario(current, scenario, options, ctx.currentYear);
          return {
            '2050': r.summary.avoidedWarming2050.median,
            '2100': r.summary.avoidedWarming2100.median,
          };
        } catch {
          return null;
        }
      },
      onChange: paint,
    });
  let worthData = ctx.latestData();
  let dataVersion = 0;
  let worth = worthOn(worthData);
  const el = h(
    'div',
    { class: 'explore' },
    aside,
    h(
      'div',
      { class: 'stage' },
      h(
        'section',
        { class: 'card chart-card', 'aria-label': t('charts.title') },
        h(
          'div',
          { class: 'card-head' },
          h(
            'div',
            { class: 'chart-tabs', role: 'tablist', 'aria-label': t('charts.title') },
            ...tabs,
          ),
          h('div', { class: 'chart-switches' }, horizonSwitch.el, rangeSwitch.el),
        ),
        panels.temperature,
        panels.avoided,
        panels.cause,
        chartDownload(t, () => ({ ...last, climate: data.climate, currentYear: ctx.currentYear })),
      ),
      error,
      strip.el,
      map.el,
    ),
  );
  const sync = (s: AppState) => {
    panel.set(s.scenario);
    timing.set(s.scenario);
    levers.set(s.scenario);
    sections.forEach(({ quick }) => quick.set(s.scenario));
    allQuick.set(s.scenario);
    options.set(s.options);
    map.update(last.result, s);
    showTab(s);
  };
  const show = (result: ScenarioResult | null, s: AppState) => {
    last = { result, state: s };
    error.hidden = result !== null;
    error.textContent = result ? '' : t('explore.runError');
    map.update(result, s);
    strip.update(
      result,
      result ? worldPerCapita(result.countries, data.countries, data.meta.baseYear) : null,
      s.scenario.rampEnd,
      s.ui.horizon,
      s.options,
    );
    showTab(s);
    drawCharts();
    worthLegend.textContent = t('worth.legend', { year: s.ui.horizon });
    if (ctx.latestData() !== worthData) {
      worthData = ctx.latestData();
      dataVersion += 1;
      worth = worthOn(worthData);
    }
    worth.request(s.scenario, s.options);
    paint(worth.values());
  };
  sync(state);
  reorder(state, new Map());
  return { el, sync, show };
};
