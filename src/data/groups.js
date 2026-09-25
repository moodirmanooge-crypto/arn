// Groups the 56 numbered modules into readable sidebar sections.
// Ranges are inclusive of module `number` values from modules.js.
export const groups = [
  { label: "Foundation", range: [1, 2] },
  { label: "Tenancy & Access", range: [3, 5] },
  { label: "Pharmacy Core", range: [6, 9] },
  { label: "Trade", range: [10, 12] },
  { label: "Relationships & Money", range: [13, 19] },
  { label: "Clinical", range: [20, 27] },
  { label: "Operations", range: [28, 39] },
  { label: "Platform & Security", range: [40, 42] },
  { label: "Interface", range: [43, 46] },
  { label: "Business", range: [47, 56] },
];

export function groupFor(number) {
  return groups.find((g) => number >= g.range[0] && number <= g.range[1])?.label ?? "Other";
}
