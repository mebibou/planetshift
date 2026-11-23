/** The en Methodology pages, one chunk loaded only for a reader who needs them. */
export default import.meta.glob('../../../docs/methodology/en/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
