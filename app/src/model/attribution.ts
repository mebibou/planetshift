// Sharing a joint effect out between the families that cause it, whatever order they are
// listed in: Shapley values (docs/methodology/en/levers.md, "Reading the breakdown").

/** n! for the small n of a coalition. */
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** The players of a coalition given as a bit mask over `players`. */
const membersOf = <P>(players: readonly P[], mask: number): P[] =>
  players.filter((_, i) => (mask & (1 << i)) !== 0);

const bitCount = (mask: number): number => (mask === 0 ? 0 : (mask & 1) + bitCount(mask >>> 1));

/** `value` += w × (joined − without), element by element. */
const addWeighted = (
  value: number[],
  w: number,
  joined: readonly number[] | undefined,
  without: readonly number[] | undefined,
): void => {
  for (let k = 0; k < value.length; k++) {
    value[k] =
      (value[k] as number) +
      w *
        (((joined as readonly number[])[k] as number) -
          ((without as readonly number[])[k] as number));
  }
};

/**
 * Each player's Shapley value of a game whose worth is a vector: the mean, over every order the
 * players can join in, of what the player adds to those before it. The values add up to the
 * worth of all the players together less that of none, and swapping two players' places in
 * `players` swaps their values and nothing else. `worth` is called once per coalition (2^n).
 */
export const shapley = <P>(
  players: readonly P[],
  worth: (coalition: readonly P[]) => readonly number[],
): Map<P, number[]> => {
  const n = players.length;
  const worths = Array.from({ length: 1 << n }, (_, mask) => worth(membersOf(players, mask)));
  const weight = Array.from(
    { length: n },
    (_, size) => (factorial(size) * factorial(n - size - 1)) / factorial(n),
  );
  const length = worths[0]?.length ?? 0;
  const maskWeight = worths.map((_, mask) => weight[bitCount(mask)] ?? 0);
  return new Map(
    players.map((player, i) => {
      const bit = 1 << i;
      const value = new Array<number>(length).fill(0);
      // Loops: 2^n coalitions for each player.
      for (let mask = 0; mask < worths.length; mask++) {
        if ((mask & bit) === 0) {
          addWeighted(value, maskWeight[mask] as number, worths[mask | bit], worths[mask]);
        }
      }
      return [player, value];
    }),
  );
};
