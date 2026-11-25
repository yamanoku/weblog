// Kind classes sit beside the shared layout class so diary and article can be styled apart.

export function entryKindClass(kind: string): string {
  if (kind === "diary") return "entry--diary";
  if (kind === "article") return "entry--article";
  return "";
}

export function entryClass(base: string, kind: string): string {
  const kindClass = entryKindClass(kind);
  return kindClass === "" ? base : `${base} ${kindClass}`;
}
