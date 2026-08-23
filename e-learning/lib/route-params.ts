/**
 * Route segments arrive as strings. Anything that is not a positive integer is a
 * URL nobody could have got from the app, so the pages treat it as a 404 rather
 * than querying with it.
 */
export function parseRouteId(value: string): number {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : Number.NaN;
}
