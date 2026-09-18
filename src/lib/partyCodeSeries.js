import Counter from "@/models/Counter";

/**
 * Synchronise a company counter with legacy party records, then reserve a
 * unique sequential party code. Counter increments are atomic, so concurrent
 * bulk imports cannot hand out the same number.
 */
export async function initialisePartyCodeSeries({ Model, companyId, field, prefix, counterId }) {
  const current = await Counter.findOne({ companyId, id: counterId }).select("prefix").lean();
  const activePrefix = current?.prefix || prefix;
  const records = await Model.find(
    { companyId, [field]: { $regex: new RegExp(`^${activePrefix}-(\\d+)$`, "i") } },
    { [field]: 1 }
  ).lean();

  const highestExisting = records.reduce((highest, record) => {
    const match = String(record[field] || "").match(new RegExp(`^${activePrefix}-(\\d+)$`, "i"));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  await Counter.findOneAndUpdate(
    { companyId, id: counterId },
    { $max: { seq: highestExisting }, $setOnInsert: { prefix: activePrefix } },
    { upsert: true, new: true }
  );
  return activePrefix;
}

export async function reservePartyCode({ companyId, prefix, counterId }) {
  const query = { companyId, id: counterId };
  let counter;
  try {
    counter = await Counter.findOneAndUpdate(
      query,
      { $inc: { seq: 1 }, $setOnInsert: { prefix } },
      { upsert: true, new: true }
    );
  } catch (error) {
    // Two first-time imports can race to create the counter document. Once
    // one wins its unique index, increment the newly created document.
    if (error?.code !== 11000) throw error;
    counter = await Counter.findOneAndUpdate(
      query,
      { $inc: { seq: 1 } },
      { new: true }
    );
  }
  return `${counter.prefix || prefix}-${String(counter.seq).padStart(4, "0")}`;
}

export function normaliseManualPartyCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function isValidManualPartyCode(value) {
  return /^[A-Z][A-Z0-9_-]{1,49}$/.test(value);
}

// A manual SUPP-#### / CUST-#### code must also move the matching automatic
// series forward, otherwise the next generated code could reuse it.
export async function registerManualPartyCode({ companyId, code, prefix, counterId }) {
  const current = await Counter.findOne({ companyId, id: counterId }).select("prefix").lean();
  const activePrefix = current?.prefix || prefix;
  const match = String(code).match(new RegExp(`^${activePrefix}-(\\d+)$`, "i"));
  if (!match) return;
  await Counter.findOneAndUpdate(
    { companyId, id: counterId },
    { $max: { seq: Number(match[1]) } },
    { upsert: true, new: true }
  );
}
