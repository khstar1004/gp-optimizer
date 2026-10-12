const SUDO_SOURCE_LABEL_REPLACEMENTS: [RegExp, string][] = [
  [/senario\.pdf\s*#\s*(\d+)/gi, "원자료 #$1"],
  [/senario\.pdf\s+page[_\s-]*(\d+)/gi, "원자료 $1쪽"],
  [/PDF\s+page[_\s-]*(\d+)/gi, "원자료 $1쪽"],
  [/page[_\s-]*(\d+)\s+OCR/gi, "원자료 $1쪽 OCR"],
  [/page[_\s-]*(\d+)\s+figure/gi, "원자료 $1쪽 figure"],
  [/senario\.pdf/gi, "원자료"],
  [/(^|\s)PDF(?=\s|$)/gi, "$1원자료"],
];

export function formatSudoSourceDisplayLabel(value: string) {
  return SUDO_SOURCE_LABEL_REPLACEMENTS.reduce(
    (label, [pattern, replacement]) => label.replace(pattern, replacement),
    value
  ).trim();
}

export function summarizeSudoSourceDisplayValues(
  items: readonly string[],
  limit = 3,
  separator = " / "
) {
  const values = items
    .map((item) => formatSudoSourceDisplayLabel(item))
    .map((item) => item.trim())
    .filter(Boolean);
  const visible = values.slice(0, limit);
  const hidden = values.length - visible.length;

  return [...visible, ...(hidden > 0 ? [`+${hidden}건`] : [])].join(separator);
}
