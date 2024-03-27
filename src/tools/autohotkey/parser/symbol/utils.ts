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
