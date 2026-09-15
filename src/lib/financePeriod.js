export function currentFiscalYear(date = new Date()) {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

export function fiscalYearOptions(count = 5, date = new Date()) {
  const year = date.getFullYear();
  const currentStart = date.getMonth() >= 3 ? year : year - 1;
  return Array.from({ length: count }, (_, index) => {
    const start = currentStart - index;
    return `${start}-${String(start + 1).slice(-2)}`;
  });
}
