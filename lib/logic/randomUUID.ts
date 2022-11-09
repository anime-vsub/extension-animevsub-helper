export const randomUUID =
  (typeof crypto !== "undefined"
    // eslint-disable-next-line operator-linebreak
    ? // eslint-disable-next-line no-undef
    crypto.randomUUID?.bind(crypto)
    : undefined) ??
  (() => (+Math.random().toString().replace(".", "")).toString(34))
