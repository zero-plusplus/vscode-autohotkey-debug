export const maskContinuationSection = (text: string): string => {
  const linebreak = 0 < text.indexOf('\r\n') ? '\r\n' : '\n';
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
    const lines = substring.split(/\r\n|\n/gu);
    return lines.map((line, i, array) => {
      if (i === 0 || i === (array.length - 1)) {
        return line;
      }
      return line.replace(/[^\s]/gu, maskedChar);
    }).join(linebreak);
  });
};
export const maskBlockComments = (text: string): string => {
  const linebreak = 0 < text.indexOf('\r\n') ? '\r\n' : '\n';
  const maskedChar = '*';

  return text.replace(/((?<=\/\*)((?:\*(?!\/)|[^*])*)(?=\*\/))/gsu, (substring) => {
    const lines = substring.split(/\r\n|\n/gu);
    return lines.map((line) => {
      return line.replace(/[^\s]/gu, maskedChar);
    }).join(linebreak);
  });
};
