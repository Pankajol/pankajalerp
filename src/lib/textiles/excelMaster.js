const systemColumns = [
  { name: "documentNumber", label: "Document Number" },
  { name: "status", label: "Status" },
];

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

function tableSheetNames(config) {
  const used = new Set(["records", "instructions"]);
  return new Map(
    config.fields
      .filter((field) => field.type === "table")
      .map((field) => {
        const base = String(field.label || field.name || "Child Rows")
          .replace(/[\\/?*[\]:]/g, " ")
          .trim()
          .slice(0, 31) || "Child Rows";
        let name = base;
        let suffix = 2;
        while (used.has(name.toLowerCase())) {
          const ending = ` ${suffix}`;
          name = `${base.slice(0, 31 - ending.length)}${ending}`;
          suffix += 1;
        }
        used.add(name.toLowerCase());
        return [field.name, name];
      })
  );
}

const isBlank = (value) =>
  value === "" || value === null || value === undefined;

export async function downloadMasterTemplate(config, slug) {
  const XLSX = await import("xlsx");
  const columns = [
    ...systemColumns,
    ...config.fields.filter((field) => field.type !== "table"),
  ];
  const childSheetNames = tableSheetNames(config);
  const records = XLSX.utils.aoa_to_sheet([columns.map((field) => field.label), []]);
  records["!cols"] = columns.map((field) => ({ wch: Math.min(35, Math.max(14, field.label.length + 3)) }));
  records["!freeze"] = { xSplit: 0, ySplit: 1 };

  const instructions = XLSX.utils.aoa_to_sheet([
    [config.label, "Excel Import Template"],
    ["Instructions", "Enter one master record per row in Records. Enter repeatable child rows in their separate sheet. Parent Row is automatic when Records has only one record; otherwise enter its Excel row number."],
    ["Example", "Records row 2: enter the master fields. Composition row 2: enter Fiber and Percentage; Parent Row may be blank when there is only one Records row."],
    ["Field", "Key", "Type", "Required", "Allowed values / format"],
    ["Document Number", "documentNumber", "text", "No", `Leave blank to auto-generate with ${config.prefix} prefix`],
    ["Status", "status", "select", "No", (config.statuses || ["Draft", "Approved", "In Process", "Hold", "Completed", "Rejected", "Cancelled"]).join(" | ")],
    ...config.fields.map((field) => [
      field.label, field.name, field.type, field.required ? "Yes" : "No",
      field.type === "table"
        ? `Use the '${childSheetNames.get(field.name)}' sheet. For multiple Records, repeat the matching Parent Row for every child row.`
        : field.type === "link"
          ? `Enter the linked record code, name, or ObjectId (${field.link})`
          : (field.options || []).join(" | "),
    ]),
  ]);
  instructions["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 70 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, records, "Records");
  for (const field of config.fields.filter((item) => item.type === "table")) {
    const childColumns = [
      { name: "parentRow", label: "Parent Row" },
      ...field.columns,
    ];
    const childSheet = XLSX.utils.aoa_to_sheet([
      childColumns.map((column) => column.label),
      [],
    ]);
    childSheet["!cols"] = childColumns.map((column) => ({
      wch: Math.min(35, Math.max(14, column.label.length + 3)),
    }));
    childSheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(
      workbook,
      childSheet,
      childSheetNames.get(field.name)
    );
  }
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  XLSX.writeFile(workbook, `${slug}-import-template.xlsx`);
}

export async function parseMasterWorkbook(file, config) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const worksheet = workbook.Sheets.Records || workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error("Workbook does not contain a Records sheet");
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: true });
  const fields = [...systemColumns, ...config.fields];
  const aliases = new Map(fields.flatMap((field) => [[normalizeHeader(field.label), field], [normalizeHeader(field.name), field]]));

  const recordsBySheetRow = new Map();
  const rows = rawRows.map((raw, rowIndex) => {
    const row = {};
    for (const [header, value] of Object.entries(raw)) {
      const field = aliases.get(normalizeHeader(header));
      if (!field) continue;
      if (field.type === "table" && value) {
        try { row[field.name] = typeof value === "string" ? JSON.parse(value) : value; }
        catch { throw new Error(`Row ${rowIndex + 2}: ${field.label} must be valid JSON`); }
      } else if (field.type === "checkbox") {
        if (!isBlank(value)) {
          row[field.name] = ["true", "yes", "1", "y"].includes(
            String(value).trim().toLowerCase()
          );
        }
      } else {
        row[field.name] = value;
      }
    }
    recordsBySheetRow.set(Number(raw.__rowNum__ ?? rowIndex + 1) + 1, row);
    return row;
  });
  const populatedRows = rows.filter((row) =>
    Object.values(row).some((value) => !isBlank(value))
  );

  const childSheetNames = tableSheetNames(config);
  for (const field of config.fields.filter((item) => item.type === "table")) {
    const sheetName = childSheetNames.get(field.name);
    const childSheet = workbook.Sheets[sheetName];
    if (!childSheet) continue;
    const childRows = XLSX.utils.sheet_to_json(childSheet, {
      defval: "",
      raw: true,
    });
    const childAliases = new Map(
      field.columns.flatMap((column) => [
        [normalizeHeader(column.label), column],
        [normalizeHeader(column.name), column],
      ])
    );

    childRows.forEach((raw, childIndex) => {
      const parentEntry = Object.entries(raw).find(([header]) =>
        ["parentrow", "recordsrow"].includes(normalizeHeader(header))
      );
      const hasChildValues = Object.entries(raw).some(
        ([header, value]) =>
          !["parentrow", "recordsrow"].includes(normalizeHeader(header)) &&
          !isBlank(value)
      );
      if (!hasChildValues) return;

      const suppliedParentRow = parentEntry?.[1];
      const parentRow = Number(suppliedParentRow);
      const childSheetRow = Number(raw.__rowNum__ ?? childIndex + 1) + 1;
      let parentRecord;
      if (populatedRows.length === 1) {
        parentRecord = populatedRows[0];
      } else if (Number.isInteger(parentRow) && parentRow >= 2) {
        parentRecord = recordsBySheetRow.get(parentRow);
      } else if (isBlank(suppliedParentRow)) {
        parentRecord = recordsBySheetRow.get(childSheetRow);
      } else {
        throw new Error(
          `${sheetName} row ${childSheetRow}: Parent Row is required when the Records sheet contains multiple records`
        );
      }
      if (!parentRecord) {
        const requestedParentRow = isBlank(suppliedParentRow)
          ? childSheetRow
          : parentRow;
        throw new Error(
          `${sheetName} row ${childSheetRow}: Records row ${requestedParentRow} does not exist`
        );
      }

      const child = {};
      for (const [header, value] of Object.entries(raw)) {
        const column = childAliases.get(normalizeHeader(header));
        if (!column) continue;
        if (column.type === "checkbox") {
          child[column.name] = ["true", "yes", "1", "y"].includes(
            String(value).trim().toLowerCase()
          );
        } else {
          child[column.name] = value;
        }
      }
      parentRecord[field.name] ||= [];
      parentRecord[field.name].push(child);
    });
  }

  const importRows = rows.filter((row) =>
    Object.values(row).some((value) => !isBlank(value))
  );
  if (!importRows.length) {
    throw new Error(
      "Records sheet is empty. Add at least one row with Composition Name, then add its Fiber and Percentage in the Composition sheet."
    );
  }
  return importRows;
}
