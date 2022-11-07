export const randomUUID =
  // eslint-disable-next-line no-undef
  (typeof crypto !== "undefined" ? crypto.randomUUID : undefined) ??
  (() => (+Math.random().toString().replace(".", "")).toString(34))
