import { replaceLines } from '../../../string';

export const maskContinuationSection = (text: string): string => {
  const maskedChar = '*';

  return text.replace(/^[^\S\r\n]*\([^)\r\n]*(?:(?:\r\n|\n)[^)]?[^\r\n]*)*(?:\r\n|\n)[^\S\r\n]*\)/gmu, (substring) => {
    // [Source]
    // (LTrim
    //   foo
    // )
    // [Masked]
    // (LTrim
    //   ***
    // )
    return replaceLines(substring, (line, i, lineCount) => {
      if (i === 0 || i === (lineCount - 1)) {
        return line;
      }
      return line.replace(/[^\s]/gu, maskedChar);
    });
  });
};
export const maskBlockComments = (text: string): string => {
  const maskedChar = '*';

  return text.replace(/((?<=\/\*)((?:\*(?!\/)|[^*])*)(?=\*\/))/gsu, (substring) => {
    return replaceLines(substring, (line) => {
      return line.replace(/[^\s]/gu, maskedChar);
    });
  });
};
