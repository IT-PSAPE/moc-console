export function parseSortValue(value: string) {
  const separatorIndex = value.lastIndexOf("-");
  return [value.slice(0, separatorIndex), value.slice(separatorIndex + 1)] as const;
}
