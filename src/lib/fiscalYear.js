// Shared April–March fiscal-year utilities. This module is browser-safe and
// can be used by report pages as well as API routes.
export function getFiscalYear(date = new Date()) {
  const value = new Date(date);
  const startYear = value.getMonth() >= 3 ? value.getFullYear() : value.getFullYear() - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function getFiscalYearOptions({ date = new Date(), past = 3, future = 3 } = {}) {
  const currentStart = Number(getFiscalYear(date).slice(0, 4));
  return Array.from({ length: past + future + 1 }, (_, index) => {
    const start = currentStart - past + index;
    const value = `${start}-${String(start + 1).slice(-2)}`;
    return { value, label: value };
  });
}
