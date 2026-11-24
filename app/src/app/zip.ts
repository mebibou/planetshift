/** Text files as one ZIP. fflate is loaded on the first call, so the page does not carry it. */
export const zipBlob = async (files: Readonly<Record<string, string>>): Promise<Blob> => {
  const { strToU8, zipSync } = await import('fflate');
  const bytes = zipSync(
    Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])),
    { level: 6 },
  );
  return new Blob([bytes], { type: 'application/zip' });
};

/** The data files of a folder and a LICENSE.txt as one ZIP, or null when one cannot be read. */
export const dataZip = async (
  folder: string,
  names: readonly string[],
  licence: string,
): Promise<Blob | null> => {
  const texts = await Promise.all(
    names.map((name) =>
      fetch(folder + name)
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null),
    ),
  );
  return texts.every((t) => t !== null)
    ? zipBlob({
        ...Object.fromEntries(names.map((name, i) => [name, texts[i] as string])),
        'LICENSE.txt': licence,
      })
    : null;
};
