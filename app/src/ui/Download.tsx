import { useState, type ButtonHTMLAttributes } from 'react';
import { chartComposition, imageBlob, mapComposition } from '../app/imageCapture';
import type { AppState } from '../app/context';
import {
  chartCsv,
  chartFileName,
  citation,
  DOWNLOAD_LICENCES,
  fileLicences,
  formatBytes,
  saveBlob,
  saveFile,
  type DownloadFile,
  type Licence,
} from '../app/download';
import { CHARTS, type ChartTab } from '../app/url';
import type { Climate, Meta } from '../data/types';
import type { T } from '../i18n/i18n';
import type { ScenarioResult } from '../model/api';
import { DownloadMenu } from './DownloadMenu';
import { Icon } from './Icon';

/** A button with the download icon; `name` is what a screen reader says, when it says more. */
export const DownloadButton = ({
  label,
  name = label,
  className = '',
  ...rest
}: { label: string; name?: string } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={`download-button ${className}`.trim()}
    aria-label={name}
    {...rest}
  >
    <Icon name="download" />
    <span>{label}</span>
  </button>
);

/** A line under the download buttons that says when there is nothing to save. */
const Status = ({ text }: { text: string }) => (
  <p className="hint download-status" role="status">
    {text}
  </p>
);

export type ImageFormat = 'png' | 'svg';

/** The credit line of an exported image: the site and the day it was saved. */
export const creditLine = (t: T): string =>
  t('download.credit', { date: new Date().toISOString().slice(0, 10) });

/** Saves a file or a drawn image, or says in one status line that there is nothing to save. */
const useSave = (t: T) => {
  const [status, setStatus] = useState('');
  const say = (saved: boolean) => setStatus(saved ? '' : t('download.unavailable'));
  return {
    status,
    save: (file: DownloadFile | null) => {
      say(file !== null);
      if (file) {
        saveFile(file);
      }
    },
    saveImage: (name: string, blob: Promise<Blob | null>) =>
      blob.then((b) => {
        say(b !== null);
        if (b) {
          saveBlob(name, b);
        }
      }),
  };
};

export interface ChartData {
  result: ScenarioResult | null;
  state: AppState;
  climate: Climate;
  currentYear: number;
}

/** The chart card's button that saves the current tab's data, and the line saying when it cannot. */
export const useChartDownload = (t: T, current: () => ChartData) => {
  const { status, save, saveImage } = useSave(t);
  const image = (format: ImageFormat) => () => {
    const { state } = current();
    const { ui, scenario, options } = state;
    const panel = document.getElementById(`chart-panel-${ui.chart}`);
    const texts = { title: t(`charts.tabs.${ui.chart}`), credit: creditLine(t) };
    void saveImage(
      chartFileName(ui.chart, scenario, options, format),
      panel ? imageBlob(chartComposition(panel, texts), format) : Promise.resolve(null),
    );
  };
  const button = (
    <DownloadMenu
      label={t('download.button')}
      name={t('download.chartButton')}
      className="download-chart"
      items={[
        {
          id: 'csv',
          label: t('download.formats.csv'),
          onSelect: () => {
            const { result, state, climate, currentYear } = current();
            const { ui, scenario, options } = state;
            save(chartCsv({ tab: ui.chart, result, climate, scenario, options, currentYear }));
          },
        },
        { id: 'png', label: t('download.formats.png'), onSelect: image('png') },
        { id: 'svg', label: t('download.formats.svg'), onSelect: image('svg') },
      ]}
    />
  );
  return { button, status: <Status text={status} /> };
};

const LicenceLinks = ({ t, licences }: { t: T; licences: Licence[] }) => (
  <span className="licence">
    {t('download.licence')}{' '}
    {licences.map((l, i) => (
      <span key={l.url}>
        {i ? t('download.and') : null}
        <a href={l.url} target="_blank" rel="noopener">
          {l.name}
        </a>
      </span>
    ))}
  </span>
);

export interface DownloadSources {
  map: () => DownloadFile | null;
  chart: (tab: ChartTab) => DownloadFile | null;
  scenario: () => DownloadFile | null;
}

export interface DownloadPanelProps {
  t: T;
  locale: string;
  meta: Meta;
  /** The folder the data was read from, and its files with their sizes. */
  folder: string;
  files: { name: string; bytes: number }[];
  sources: DownloadSources;
  /** The map as an image: its file name in a format, and the card it is drawn in. */
  mapImage: { name: (format: ImageFormat) => string; card: () => Element | null; title: string };
  hidden: boolean;
}

const Item = ({
  t,
  button,
  text,
  licences,
}: {
  t: T;
  button: React.ReactNode;
  text: string;
  licences: Licence[];
}) => (
  <li>
    {button}
    <p className="hint">
      {text} <LicenceLinks t={t} licences={licences} />
    </p>
  </li>
);

/** The map card's downloads: the layer, each chart, the scenario, the data files, licences and how to cite. */
export const DownloadPanel = ({
  t,
  locale,
  meta,
  folder,
  files,
  sources,
  mapImage,
  hidden,
}: DownloadPanelProps) => {
  const { status, save, saveImage } = useSave(t);
  return (
    <div className="download-panel" id="map-downloads" hidden={hidden}>
      <h3 className="chart-subtitle">{t('download.title')}</h3>
      <ul className="download-list">
        <Item
          t={t}
          button={
            <span className="download-formats">
              <DownloadButton
                label={t('download.map')}
                className="download-map"
                onClick={() => save(sources.map())}
              />
              {(['png', 'svg'] as const).map((format) => (
                <DownloadButton
                  key={format}
                  label={format.toUpperCase()}
                  name={t('download.mapImage', { format: format.toUpperCase() })}
                  className={`download-map-${format}`}
                  onClick={() => {
                    const card = mapImage.card();
                    const texts = { title: mapImage.title, credit: creditLine(t) };
                    void saveImage(
                      mapImage.name(format),
                      card ? imageBlob(mapComposition(card, texts), format) : Promise.resolve(null),
                    );
                  }}
                />
              ))}
            </span>
          }
          text={t('download.mapText')}
          licences={DOWNLOAD_LICENCES.map}
        />
        {CHARTS.map((tab) => (
          <Item
            key={tab}
            t={t}
            button={
              <DownloadButton
                label={t('download.chart', { chart: t(`charts.tabs.${tab}`) })}
                className={`download-chart-${tab}`}
                onClick={() => save(sources.chart(tab))}
              />
            }
            text={t(`download.chartText.${tab}`)}
            licences={DOWNLOAD_LICENCES.chart}
          />
        ))}
        <Item
          t={t}
          button={
            <DownloadButton
              label={t('download.scenario')}
              className="download-scenario"
              onClick={() => save(sources.scenario())}
            />
          }
          text={t('download.scenarioText')}
          licences={DOWNLOAD_LICENCES.scenario}
        />
      </ul>
      <Status text={status} />
      <p className="hint">{t('download.format')}</p>
      <details className="fold download-files">
        <summary>{t('download.files')}</summary>
        <p className="hint">{t('download.filesText')}</p>
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.name}>
              <a href={folder + f.name} download={f.name}>
                {f.name}
              </a>
              <span className="file-size">{formatBytes(locale, f.bytes)}</span>
              <LicenceLinks t={t} licences={fileLicences(f.name)} />
            </li>
          ))}
        </ul>
      </details>
      <details className="fold download-cite">
        <summary>{t('download.cite')}</summary>
        <p className="hint">{t('download.citeText')}</p>
        <p className="citation">{hidden ? '' : citation(meta, location.href)}</p>
      </details>
    </div>
  );
};
