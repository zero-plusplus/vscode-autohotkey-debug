export const escapePcreRegExEscape = (str: string): string => {
  return str
    .replace(/\\/gu, '\\\\')
    .replace(/\./gu, '\\.')
    .replace(/\*/gu, '\\*')
    .replace(/\?/gu, '\\?')
    .replace(/\+/gu, '\\+')
    .replace(/\[/gu, '\\[')
    .replace(/\{/gu, '\\{')
    .replace(/\|/gu, '\\|')
    .replace(/\(/gu, '\\(')
    .replace(/\)/gu, '\\)')
    .replace(/\^/gu, '\\^')
    .replace(/\$/gu, '\\$');
};
