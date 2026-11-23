/** `f()`, or `fallback` when it throws: storage the browser refuses, a URL or a run that fails. */
export const attempt = <T>(f: () => T, fallback: T): T => {
  let value = fallback;
  try {
    value = f();
  } catch {
    // the fallback stands
  }
  return value;
};
