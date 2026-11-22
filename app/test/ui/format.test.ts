import { describe, expect, it } from 'vitest';
import {
  formatArea,
  formatMass,
  formatPercent,
  formatSigned,
  formatSignedArea,
  formatTemperature,
  massUnit,
} from '../../src/i18n/format';

const NBSP = ' ';

describe('format', () => {
  it('picks the largest mass unit at least 1', () => {
    expect(massUnit(5e12).unit).toBe('Gt');
    expect(massUnit(-3e9).unit).toBe('Mt');
    expect(massUnit(2e6).unit).toBe('kt');
    expect(massUnit(2e3).unit).toBe('t');
    expect(massUnit(5).unit).toBe('kg');
  });

  it('formats masses with three significant digits', () => {
    expect(formatMass('en-GB', 1.2345e11)).toBe(`123${NBSP}Mt`);
    expect(formatMass('fr-FR', 1.25e12)).toBe(`1,25${NBSP}Gt`);
  });

  it('formats areas in ha, kha or Mha, signed on demand', () => {
    expect(formatArea('en-GB', 1.234e8)).toBe(`123${NBSP}Mha`);
    expect(formatArea('fr-FR', -2500)).toBe(`−2,5${NBSP}kha`);
    expect(formatArea('en-GB', 12)).toBe(`12${NBSP}ha`);
    expect(formatSignedArea('en-GB', 4e6)).toBe(`+4${NBSP}Mha`);
    expect(formatSignedArea('en-GB', -4e6)).toBe(`−4${NBSP}Mha`);
  });

  it('uses a true minus sign', () => {
    expect(formatSigned('en-GB', -0.04, 2)).toBe('−0.04');
    expect(formatSigned('en-GB', 0.04, 2)).toBe('+0.04');
    expect(formatTemperature('en-GB', -0.041, 2, true)).toBe(`−0.04${NBSP}°C`);
  });

  it('formats temperatures per locale', () => {
    expect(formatTemperature('fr-FR', 1.3, 2)).toBe(`1,30${NBSP}°C`);
  });

  it('formats percentages, signed on demand', () => {
    expect(formatPercent('en-GB', 0.1)).toBe('10%');
    expect(formatPercent('en-GB', -0.125, 1, true)).toBe('−12.5%');
    expect(formatPercent('fr-FR', 0.5).replace(/\s/g, ' ')).toBe('50 %');
  });
});
