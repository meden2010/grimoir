export const truncateString = (str: string | undefined, maxLength: number = 200, ellipsis: string = '...'): string | undefined => {
  if (!str) return str;
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + ellipsis;
};
