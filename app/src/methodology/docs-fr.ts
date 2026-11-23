/** The fr Methodology pages, one chunk loaded only for a reader who needs them. */
export default import.meta.glob('../../../docs/methodology/fr/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
