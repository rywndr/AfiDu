/** Parse a positive integer route segment used by internal numeric IDs. */
export function parseRouteId(value: string): number {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : Number.NaN;
}

/** Parse the UUID public identifiers used in assignment and module routes. */
export function parseRouteUuid(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}
