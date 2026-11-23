import type { T } from '../i18n/i18n';
import { formatSignificant } from '../i18n/format';
import { h } from './dom';
import { icon } from './icons';
import { CHARTS, type ChartTab } from './url';
import type { AppState } from './context';
import type { ScenarioResult } from '../model/api';
import type { Climate, Meta } from '../data/types';
import {
  chartCsv,
  citation,
  DOWNLOAD_LICENCES,
  fileLicences,
  saveFile,
  type DownloadFile,
  type Licence,
} from './download';

/** A line under the download buttons that says when there is nothing to save. */
const downloadStatus = (): HTMLElement => h('p', { class: 'hint download-status', role: 'status' });

const saveTo = (t: T, status: HTMLElement) => (file: DownloadFile | null) => {
  status.textContent = file ? '' : t('download.unavailable');
  if (file) saveFile(file);
};

/** A button with the download icon. */
export const downloadButton = (label: string, onClick: () => void, className = ''): HTMLElement =>
  h(
    'button',
    { type: 'button', class: `download-button ${className}`.trim(), onclick: onClick },
    icon('download'),
    h('span', {}, label),
  );

/** The chart card's footer: one button that saves the current tab's data. */
export const chartDownload = (
  t: T,
  current: () => {
    result: ScenarioResult | null;
    state: AppState;
    climate: Climate;
    currentYear: number;
  },
): HTMLElement => {
  const status = downloadStatus();
  const save = saveTo(t, status);
  return h(
    'div',
    { class: 'card-foot' },
    status,
    downloadButton(
      t('download.chartButton'),
      () => {
        const { result, state, climate, currentYear } = current();
        const { ui, scenario, options } = state;
        save(chartCsv({ tab: ui.chart, result, climate, scenario, options, currentYear }));
      },
      'download-chart',
    ),
  );
};

export const formatBytes = (locale: string, bytes: number): string =>
  bytes >= 1e6
    ? `${formatSignificant(locale, bytes / 1e6, 2)} MB`
    : `${formatSignificant(locale, Math.max(bytes / 1e3, 1), 2)} kB`;

const licenceLinks = (t: T, licences: Licence[]): HTMLElement =>
  h(
    'span',
    { class: 'licence' },
    t('download.licence'),
    ' ',
    ...licences.flatMap((l, i) => [
      i ? t('download.and') : null,
      h('a', { href: l.url, target: '_blank', rel: 'noopener' }, l.name),
    ]),
  );

export interface DownloadSources {
  map: () => DownloadFile | null;
  chart: (tab: ChartTab) => DownloadFile | null;
  scenario: () => DownloadFile | null;
}

export interface DownloadPanelContext {
  t: T;
  locale: string;
  meta: Meta;
  /** The folder the data was read from, and its files with their sizes. */
  folder: string;
  files: { name: string; bytes: number }[];
  sources: DownloadSources;
}

/** The map card's downloads: the layer, each chart, the scenario, the data files, licences and how to cite. */
export const downloadPanel = (
  ctx: DownloadPanelContext,
): { el: HTMLElement; refresh: () => void } => {
  const { t, locale, meta, folder, files, sources } = ctx;
  const item = (button: HTMLElement, text: string, licences: Licence[]) =>
    h('li', {}, button, h('p', { class: 'hint' }, text, ' ', licenceLinks(t, licences)));
  const cite = h('p', { class: 'citation' });
  const status = downloadStatus();
  const save = saveTo(t, status);
  const panel = h(
    'div',
    { class: 'download-panel', id: 'map-downloads' },
    h('h3', { class: 'chart-subtitle' }, t('download.title')),
    h(
      'ul',
      { class: 'download-list' },
      item(
        downloadButton(t('download.map'), () => save(sources.map()), 'download-map'),
        t('download.mapText'),
        DOWNLOAD_LICENCES.map,
      ),
      ...CHARTS.map((tab) =>
        item(
          downloadButton(
            t('download.chart', { chart: t(`charts.tabs.${tab}`) }),
            () => save(sources.chart(tab)),
            `download-chart-${tab}`,
          ),
          t(`download.chartText.${tab}`),
          DOWNLOAD_LICENCES.chart,
        ),
      ),
      item(
        downloadButton(t('download.scenario'), () => save(sources.scenario()), 'download-scenario'),
        t('download.scenarioText'),
        DOWNLOAD_LICENCES.scenario,
      ),
    ),
    status,
    h('p', { class: 'hint' }, t('download.format')),
    h(
      'details',
      { class: 'fold download-files' },
      h('summary', {}, t('download.files')),
      h('p', { class: 'hint' }, t('download.filesText')),
      h(
        'ul',
        { class: 'file-list' },
        ...files.map((f) =>
          h(
            'li',
            {},
            h('a', { href: folder + f.name, download: f.name }, f.name),
            h('span', { class: 'file-size' }, formatBytes(locale, f.bytes)),
            licenceLinks(t, fileLicences(f.name)),
          ),
        ),
      ),
    ),
    h(
      'details',
      { class: 'fold download-cite' },
      h('summary', {}, t('download.cite')),
      h('p', { class: 'hint' }, t('download.citeText')),
      cite,
    ),
  );
  return {
    el: panel,
    refresh: () => {
      cite.textContent = citation(meta, location.href);
    },
  };
};
