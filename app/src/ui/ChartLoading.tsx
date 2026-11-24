import type { CSSProperties } from 'react';
import type { T } from '../i18n/i18n';

/**
 * An empty chart saying it is loading, at a drawn chart's size, for a chart whose code or data is
 * not there yet: the page under it stays where it will be.
 */
export const ChartLoading = ({ t, height = [360, 280] }: { t: T; height?: [number, number] }) => (
  <figure className="chart" aria-busy="true">
    <div className="legend-slot" />
    <div
      className="chart-plot"
      data-loading={t('load.loading')}
      style={{ '--plot-h': `${height[0]}px`, '--plot-h-narrow': `${height[1]}px` } as CSSProperties}
    />
  </figure>
);
