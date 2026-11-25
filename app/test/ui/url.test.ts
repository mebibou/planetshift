import { describe, expect, it } from 'vitest';
import { buildQuery, DEFAULT_UI, modelQuery, parseUi } from '../../src/app/url';
import { encodeState, decodeState } from '../../src/model/state';
import { DEFAULT_OPTIONS } from '../../src/model/api';
import { SAMPLES } from '../model/samples';

describe('url', () => {
  it('reads the interface choices, ignoring unknown values', () => {
    expect(
      parseUi(
        '?view=methodology&layer=change&change=production&group=dairy&gas=ch4&chart=avoided&to=2100&mapview=table&range=recent&causegas=n2o&per=farmland',
      ),
    ).toEqual({
      view: 'methodology',
      layer: 'change',
      changeOf: 'production',
      group: 'dairy',
      gas: 'ch4',
      chart: 'avoided',
      horizon: '2100',
      mapView: 'table',
      range: 'recent',
      causeGas: 'n2o',
      speciesPer: 'farmland',
    });
    expect(parseUi('?view=nope&gas=xx&causegas=co2e')).toEqual(DEFAULT_UI);
    expect(parseUi('?layer=land&change=land')).toMatchObject({ layer: 'land', changeOf: 'land' });
  });

  it('opens the sea-level tab from its link', () => {
    expect(parseUi('?chart=sealevel')).toMatchObject({ chart: 'sealevel' });
  });

  it('opens an old link to The link on Explore, at the chart by cause', () => {
    expect(parseUi('?view=link&chart=avoided')).toMatchObject({ view: 'explore', chart: 'cause' });
    expect(parseUi('?chart=cause')).toMatchObject({ view: 'explore', chart: 'cause' });
  });

  it('leaves only the model part for decodeState', () => {
    expect(modelQuery('?shift=10&view=link&data=fixtures&layer=change')).toBe('shift=10');
  });

  it('writes non-default choices and keeps data=', () => {
    const q = buildQuery(
      'shift=10',
      { ...DEFAULT_UI, view: 'methodology' },
      '?data=fixtures&view=x',
    );
    expect(q).toBe('?shift=10&view=methodology&data=fixtures');
    expect(buildQuery('', { ...DEFAULT_UI, chart: 'cause', causeGas: 'ch4' }, '')).toBe(
      '?chart=cause&causegas=ch4',
    );
    expect(buildQuery('', DEFAULT_UI, '')).toBe('');
  });

  it('round-trips every sample with the model state', () => {
    SAMPLES.forEach((p) => {
      const query = buildQuery(
        encodeState(p.scenario, DEFAULT_OPTIONS),
        DEFAULT_UI,
        '?data=fixtures',
      );
      expect(decodeState(modelQuery(query)).scenario).toEqual(
        decodeState(encodeState(p.scenario, DEFAULT_OPTIONS)).scenario,
      );
      expect(parseUi(query)).toEqual(DEFAULT_UI);
    });
  });
});
