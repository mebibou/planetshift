/** The data files of each folder and their sizes in bytes, read when the site is built. */
declare const __DATA_FILES__: Record<string, { name: string; bytes: number }[]>;

/** The departures from FaIR of planetshift.config.json, read when the site is built. */
declare const __PLANETSHIFT_DEPARTURES__: import('./configSchema').Departures;
