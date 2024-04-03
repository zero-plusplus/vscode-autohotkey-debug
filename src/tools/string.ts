export const replaceLines = (text: string, callback: (lineText: string, index: number, lineCount: number) => string): string => {
  const linebreaks = [ ...text.matchAll(/\r\n|\n/gu) ];
  if (linebreaks.length === 0) {
    return callback(text, 0, 0);
  }
  const lineCount = linebreaks.length + 1;

  let index = 0;
  let currentLineIndex = 0;
  let replacedText = '';
  for (const linebreak of linebreaks) {
    if (linebreak.index === undefined) {
      continue;
    }

    const line = text.slice(index, linebreak.index);
    replacedText += callback(line, currentLineIndex, lineCount) + linebreak[0];
    index = linebreak.index + linebreak[0].length;
    currentLineIndex++;
  }
  replacedText += callback(text.slice(index), currentLineIndex, lineCount);
  return replacedText;
};
