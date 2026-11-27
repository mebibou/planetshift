// The exact Shapley values of the by-family breakdown, over full runs with each family on or off,
// for the tests that check the breakdown against them.
import { adoptionOf, FAMILIES, MODULES } from '../../src/levers/registry';
import type { Options, Scenario } from '../../src/model/api';
import { shapley } from '../../src/model/attribution';

type Switches = Partial<Pick<Scenario, 'shift' | 'groupShifts' | 'levers'>>;

const familyOfLever = (id: string): string | undefined =>
  MODULES.find((m) => m.levers.some((l) => l.id === id))?.family;

const dietOn = (s: Switches): boolean =>
  (s.shift ?? 0) > 0 || Object.values(s.groupShifts ?? {}).some((v) => (v ?? 0) > 0);

const leversOn = (family: string, s: Switches): boolean =>
  Object.keys(s.levers ?? {}).some(
    (id) => familyOfLever(id) === family && adoptionOf(s.levers ?? {}, id) > 0,
  );

const SWITCHED_ON: Readonly<Record<string, (s: Switches, o: Partial<Options>) => boolean>> = {
  diet: dietOn,
  regrowth: (_, o) => (o.regrowth ?? 'none') !== 'none',
};

/**
 * The families a scenario switches on. Every other one changes nothing, whatever else acts: a
 * null player, whose Shapley value is 0 and whose leaving out leaves the others' unchanged.
 */
export const activeFamilies = (s: Switches, o: Partial<Options>): string[] =>
  FAMILIES.filter((f) => (SWITCHED_ON[f] ?? ((x: Switches) => leversOn(f, x)))(s, o));

/** The scenario and options with every family outside `coalition` switched off, its levers at 0. */
export const withOnly = <S extends Switches, O extends Partial<Options>>(
  coalition: readonly string[],
  s: S,
  o: O,
): [S, O] => [
  {
    ...(coalition.includes('diet') ? s : { ...s, shift: 0, groupShifts: {} }),
    levers: Object.fromEntries(
      Object.entries(s.levers ?? {}).map(([id, a]) => [
        id,
        coalition.includes(familyOfLever(id) ?? '') ? a : 0,
      ]),
    ),
  },
  coalition.includes('regrowth') ? o : { ...o, regrowth: 'none' },
];

/** The Shapley values of `worth` over the families `s` and `o` switch on, each on or off. */
export const exactShapley = <S extends Switches, O extends Partial<Options>>(
  s: S,
  o: O,
  worth: (s: S, o: O) => readonly number[],
): Map<string, number[]> =>
  shapley(activeFamilies(s, o), (coalition) => worth(...withOnly(coalition, s, o)));

/**
 * Groups of at most 8 families, 2⁸ runs each, that together cover every family. Families that
 * interact are on together: farming's through production, and the grid's users, farming's
 * electricity included, through the grid.
 */
export const FAMILY_GROUPS: readonly (readonly string[])[] = [
  [
    'diet',
    'plantFoods',
    'waste',
    'deforestation',
    'regrowth',
    'practices',
    'removals',
    'wasteMethane',
  ],
  ['energy', 'industry', 'dac', 'fossilMethane', 'hfc', 'diet', 'practices', 'waste'],
];
