export const randomUUID =
  // eslint-disable-next-line no-undef
  (typeof crypto !== "undefined" ? crypto.randomUUID?.bind(crypto) : undefined) ??
  (() => (+Math.random().toString().replace(".", "")).toString(34))
