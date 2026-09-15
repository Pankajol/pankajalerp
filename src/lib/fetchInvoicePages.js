export async function fetchInvoicePages(url, token) {
  const records = [];
  let page = 1;
  while (true) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(`${url}${separator}page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.data)) {
      throw new Error(result.error || result.message || "Unable to load invoices");
    }
    records.push(...result.data);
    const totalPages = result.meta?.pages ?? result.pagination?.pages ?? 1;
    if (page >= totalPages) return records;
    page += 1;
  }
}
