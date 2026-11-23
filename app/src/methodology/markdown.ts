import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';

/** `nonStandard` lets a formula touch punctuation, so a currency sign must be written `\$`. */
export const markdown = new Marked(
  markedKatex({ throwOnError: false, output: 'htmlAndMathml', nonStandard: true }),
);

export const renderMarkdown = (text: string): string => markdown.parse(text, { async: false });
