// FaIR's three-layer energy balance model (energy_balance_model.py), discretised to a yearly
// step: state = [stochastic forcing, T surface, T middle, T deep ocean].

export type EbmParams = {
  heatCapacity: readonly number[];
  heatTransfer: readonly number[];
  deepOceanEfficacy: number;
  gamma: number;
};

/** The yearly step: state(t+1) = matrix · state(t) + vector · forcing(t+1). Matrix row-major. */
export type Discrete = { matrix: Float64Array; vector: Float64Array };

export const SIZE = 4;

const at = (m: readonly number[], r: number, c: number): number => m[r * SIZE + c] as number;

const identity = (): number[] =>
  Array.from({ length: SIZE * SIZE }, (_, k) => (k % (SIZE + 1) === 0 ? 1 : 0));

export const multiply = (a: readonly number[], b: readonly number[]): number[] =>
  Array.from({ length: SIZE * SIZE }, (_, k) => {
    const r = Math.floor(k / SIZE);
    const c = k % SIZE;
    return [0, 1, 2, 3].reduce((acc, j) => acc + at(a, r, j) * at(b, j, c), 0);
  });

const add = (a: readonly number[], b: readonly number[], f = 1): number[] =>
  a.map((x, k) => x + f * (b[k] as number));

const norm1 = (m: readonly number[]): number =>
  Math.max(...[0, 1, 2, 3].map((c) => [0, 1, 2, 3].reduce((s, r) => s + Math.abs(at(m, r, c)), 0)));

/** FaIR's `_eb_matrix` for three ocean layers (with a timestep of one year). */
export const ebMatrix = ({ heatCapacity, heatTransfer, deepOceanEfficacy, gamma }: EbmParams) => {
  const [c0, c1, c2] = heatCapacity as [number, number, number];
  const [k0, k1, k2] = heatTransfer as [number, number, number];
  const e = deepOceanEfficacy;
  return [
    [-gamma, 0, 0, 0],
    [1 / c0, -(k0 + k1) / c0, k1 / c0, 0],
    [0, k1 / c1, -(k1 + e * k2) / c1, (e * k2) / c1],
    [0, 0, k2 / c2, -k2 / c2],
  ].flat();
};

const TAYLOR_TERMS = 18;

/** e^A by scaling and squaring a Taylor series: A/2^s small enough that the series converges to
 * machine precision, then squared s times. */
export const expm = (a: readonly number[]): number[] => {
  const squarings = Math.max(0, Math.ceil(Math.log2(norm1(a) / 0.25)));
  const scaled = a.map((x) => x / 2 ** squarings);
  const series = Array.from({ length: TAYLOR_TERMS }, (_, k) => k + 1).reduce(
    ({ sum, term }, k) => {
      const next = multiply(term, scaled).map((x) => x / k);
      return { sum: add(sum, next), term: next };
    },
    { sum: identity(), term: identity() },
  ).sum;
  return Array.from({ length: squarings }).reduce<number[]>((m) => multiply(m, m), series);
};

/** x with A·x = b, by Gaussian elimination with partial pivoting. */
export const solve = (a: readonly number[], b: readonly number[]): number[] => {
  const rows = [0, 1, 2, 3].map((r) => [...a.slice(r * SIZE, r * SIZE + SIZE), b[r] as number]);
  const reduced = [0, 1, 2, 3].reduce((m, col) => {
    const pivot = m
      .slice(col)
      .reduce(
        (best, row, k) =>
          Math.abs(row[col] as number) > Math.abs((m[best] as number[])[col] as number)
            ? col + k
            : best,
        col,
      );
    const swapped = m.map(
      (row, r) => (r === col ? m[pivot] : r === pivot ? m[col] : row) as number[],
    );
    const p = swapped[col] as number[];
    return swapped.map((row, r) =>
      r <= col
        ? row
        : row.map((x, c) => x - ((row[col] as number) / (p[col] as number)) * (p[c] as number)),
    );
  }, rows);
  return [3, 2, 1, 0].reduce<number[]>(
    (x, r) => {
      const row = reduced[r] as number[];
      const known = [r + 1, r + 2, r + 3]
        .filter((c) => c < SIZE)
        .reduce((s, c) => s + (row[c] as number) * (x[c] as number), 0);
      const out = [...x];
      out[r] = ((row[SIZE] as number) - known) / (row[r] as number);
      return out;
    },
    [0, 0, 0, 0],
  );
};

/** FaIR's `eb_matrix_d` and `forcing_vector_d`. */
export const discretise = (params: EbmParams): Discrete => {
  const a = ebMatrix(params);
  const matrixD = expm(a);
  const minusI = add(matrixD, identity(), -1);
  const rhs = [0, 1, 2, 3].map((r) => at(minusI, r, 0) * params.gamma);
  return { matrix: Float64Array.from(matrixD), vector: Float64Array.from(solve(a, rhs)) };
};
