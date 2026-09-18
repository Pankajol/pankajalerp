/** Central, double-entry posting service. Transaction is the source of truth;
 * LedgerEntry is the per-account projection used by ledger screens. */
import Transaction from "@/models/accounts/Transaction";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import AccountHead from "@/models/accounts/AccountHead";
import Counter from "@/models/Counter";
import mongoose from "mongoose";
import Customer from "@/models/CustomerModel";
import Supplier from "@/models/SupplierModels";

const SYSTEM_ACCOUNTS = {
  "Cash in Hand": { type: "Asset", group: "Cash", balanceType: "Debit" },
  "Bank Account": { type: "Asset", group: "Bank Account", balanceType: "Debit" },
  "Digital Payments": { type: "Asset", group: "Current Asset", balanceType: "Debit" },
  "Sales Revenue": { type: "Income", group: "Direct Income", balanceType: "Credit" },
  "Output GST Payable": { type: "Liability", group: "Current Liability", balanceType: "Credit" },
  "Input GST Credit": { type: "Asset", group: "Current Asset", balanceType: "Debit" },
  "Goods Received Not Invoiced": { type: "Liability", group: "Current Liability", balanceType: "Credit" },
  "Sales Returns": { type: "Expense", group: "Direct Expense", balanceType: "Debit" },
  Purchase: { type: "Expense", group: "Direct Expense", balanceType: "Debit" },
  "Purchase Returns": { type: "Income", group: "Direct Income", balanceType: "Credit" },
  "Inventory / Stock": { type: "Asset", group: "Current Asset", balanceType: "Debit" },
  "Salary Expense": { type: "Expense", group: "Indirect Expense", balanceType: "Debit" },
};
const TYPE_PREFIX = { "Sales Invoice": "SI", "Purchase Invoice": "PI", Receipt: "REC", Payment: "PAY", "Credit Note": "CN", "Debit Note": "DN", "Journal Entry": "JE", Contra: "CTR" };

const money = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero");
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

async function systemAccount(companyId, name, session = null) {
  const definition = SYSTEM_ACCOUNTS[name];
  if (!definition) throw new Error(`Unknown system account: ${name}`);
  return AccountHead.findOneAndUpdate({ companyId, name }, { $setOnInsert: { companyId, name, ...definition, isActive: true, isSystemAccount: true } }, { upsert: true, new: true, session });
}
async function partyAccount(companyId, partyType, partyId, session = null) {
  const Model = partyType === "Customer" ? Customer : Supplier;
  const party = await Model.findOne({ _id: partyId, companyId }).select("glAccount customerName supplierName customerCode supplierCode").session(session);
  if (!party) throw new Error(`${partyType} does not belong to this company`);
  let account = party.glAccount
    ? await AccountHead.findOne({ _id: party.glAccount, companyId, isActive: true }).session(session)
    : null;
  // Imports and older master records may not yet have a party ledger. Create
  // the subsidiary account on first financial posting so an invoice never
  // silently loses its accounting entry.
  if (!account) {
    const partyName = party.customerName || party.supplierName || `${partyType} ${partyId}`;
    const type = partyType === "Customer" ? "Asset" : "Liability";
    const partyCode = String(party.customerCode || party.supplierCode || partyId).replace(/[^a-zA-Z0-9-]/g, "").slice(-20);
    const code = `${partyType === "Customer" ? "CUS" : "SUP"}-${partyCode}`;
    // Never locate a party ledger only by display name: two parties can share a
    // name. The deterministic code guarantees that each master record gets its
    // own subsidiary account when importing older data without a glAccount.
    account = await AccountHead.findOneAndUpdate(
      { companyId, code },
      {
        $setOnInsert: {
          companyId,
          name: `${partyType} ${partyCode} - ${partyName}`,
          code,
          type,
          group: partyType === "Customer" ? "Accounts Receivable" : "Current Liability",
          balanceType: partyType === "Customer" ? "Debit" : "Credit",
          isSystemAccount: false,
          isActive: true,
        },
      },
      { upsert: true, new: true, session }
    );
    party.glAccount = account._id;
    await party.save({ session });
  }
  if (!account) throw new Error(`${partyType} ledger account is unavailable`);
  return account;
}
async function paymentAccount(companyId, bankAccountId, fallbackName, session = null) {
  if (bankAccountId) {
    const account = await AccountHead.findOne({ _id: bankAccountId, companyId, type: "Asset", isActive: true }).session(session);
    if (!account) throw new Error("Selected cash/bank account is unavailable");
    return account;
  }
  return systemAccount(companyId, fallbackName || "Bank Account", session);
}
async function nextNumber(companyId, type, session = null) {
  const counter = await Counter.findOneAndUpdate(
    { companyId, id: `accounting_${type}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session }
  );
  return `${TYPE_PREFIX[type] || "TXN"}-${new Date().getFullYear()}-${String(counter.seq).padStart(5, "0")}`;
}

async function writeLedger(transaction, session = null) {
  const ids = [...new Set(transaction.lines.map((line) => String(line.accountId)))];
  const accounts = await AccountHead.find({ _id: { $in: ids }, companyId: transaction.companyId }).select("name balanceType").session(session);
  if (accounts.length !== ids.length) throw new Error("A journal line refers to an invalid account");
  const accountMap = new Map(accounts.map((account) => [String(account._id), account]));
  const entries = transaction.lines.map((line) => {
    const account = accountMap.get(String(line.accountId));
    const balance = account.balanceType === "Debit" ? (line.type === "Debit" ? line.amount : -line.amount) : (line.type === "Credit" ? line.amount : -line.amount);
    return { companyId: transaction.companyId, accountId: line.accountId, accountName: line.accountName || account.name, transactionId: transaction._id, transactionNumber: transaction.transactionNumber, transactionType: transaction.type, date: transaction.date, debit: line.type === "Debit" ? line.amount : 0, credit: line.type === "Credit" ? line.amount : 0, balance, narration: transaction.narration, partyId: transaction.partyId, partyName: transaction.partyName, partyType: transaction.partyType, fiscalYear: transaction.fiscalYear };
  });
  await LedgerEntry.insertMany(entries, { session });
}

export async function postAccountingTransaction(input) {
  const { companyId, type, lines, referenceId, session = null } = input;
  if (!companyId || !type || !Array.isArray(lines) || lines.length < 2) throw new Error("A transaction needs at least two journal lines");
  const normalized = lines.map((line) => ({ ...line, amount: money(line.amount) }));
  const debit = normalized.filter((line) => line.type === "Debit").reduce((sum, line) => sum + line.amount, 0);
  const credit = normalized.filter((line) => line.type === "Credit").reduce((sum, line) => sum + line.amount, 0);
  if (Math.abs(debit - credit) > 0.001) throw new Error("Journal entry is not balanced");
  if (referenceId) {
    const existing = await Transaction.findOne({ companyId, type, referenceId, status: "Posted" }).session(session);
    if (existing) return existing;
  }
  const { session: ignoredSession, ...document } = input;
  try {
    const [transaction] = await Transaction.create([{
      ...document,
      transactionNumber: input.transactionNumber || await nextNumber(companyId, type, session),
      date: input.date || new Date(), totalAmount: debit, lines: normalized, status: "Posted",
    }], { session });
    await writeLedger(transaction, session);
    return transaction;
  } catch (error) {
    // The unique source-reference index protects concurrent requests. Returning
    // the winner makes retries idempotent instead of creating a second journal.
    if (error?.code === 11000 && referenceId) {
      const existing = await Transaction.findOne({ companyId, type, referenceId, status: "Posted" }).session(session);
      if (existing) return existing;
    }
    throw error;
  }
}

const postPartyDocument = async ({ partyType, incomeAccount, taxAccount, transactionType, referenceType, ...input }) => {
  const total = money(input.amount);
  const taxAmount = Math.round(Number(input.taxAmount || 0) * 100) / 100;
  if (taxAmount < 0 || taxAmount - total > 0.001) throw new Error("Tax amount must be between zero and the document total");
  const [party, income, tax] = await Promise.all([
    partyAccount(input.companyId, partyType, input.partyId, input.session),
    systemAccount(input.companyId, incomeAccount, input.session),
    taxAmount > 0 ? systemAccount(input.companyId, taxAccount, input.session) : null,
  ]);
  const partyLineType = partyType === "Customer" ? "Debit" : "Credit";
  const incomeLineType = partyLineType === "Debit" ? "Credit" : "Debit";
  const lines = [{ accountId: party._id, accountName: party.name, type: partyLineType, amount: total }];
  if (total - taxAmount > 0.001) {
    lines.push({ accountId: income._id, accountName: income.name, type: incomeLineType, amount: total - taxAmount });
  }
  if (taxAmount > 0) lines.push({ accountId: tax._id, accountName: tax.name, type: incomeLineType, amount: taxAmount });
  return postAccountingTransaction({ ...input, type: transactionType, partyType, referenceType, lines });
};
export const autoSalesInvoice = (input) => postPartyDocument({ ...input, partyType: "Customer", incomeAccount: "Sales Revenue", taxAccount: "Output GST Payable", transactionType: "Sales Invoice", referenceType: "SalesInvoice", narration: input.narration || `Sales invoice ${input.referenceNumber}` });
export const autoPurchaseInvoice = (input) => postPartyDocument({ ...input, partyType: "Supplier", incomeAccount: input.fromGRN ? "Goods Received Not Invoiced" : "Purchase", taxAccount: "Input GST Credit", transactionType: "Purchase Invoice", referenceType: "PurchaseInvoice", narration: input.narration || `Purchase invoice ${input.referenceNumber}` });

async function postPayment(input, partyType) {
  const [party, bank] = await Promise.all([partyAccount(input.companyId, partyType, input.partyId, input.session), paymentAccount(input.companyId, input.bankAccountId, input.bankAccountName, input.session)]);
  const isReceipt = partyType === "Customer";
  const modeMap = { cash: "Cash", bank: "Bank Transfer", netbanking: "Bank Transfer", upi: "UPI", card: "Card", cheque: "Cheque", wallet: "Other" };
  const paymentMode = modeMap[String(input.paymentMode || "").toLowerCase()] || input.paymentMode || "Bank Transfer";
  return postAccountingTransaction({ ...input, paymentMode, type: isReceipt ? "Receipt" : "Payment", partyType, bankAccountId: bank._id, referenceType: "Manual", narration: input.narration || `${isReceipt ? "Receipt from" : "Payment to"} ${input.partyName}`, lines: [{ accountId: isReceipt ? bank._id : party._id, accountName: isReceipt ? bank.name : party.name, type: "Debit", amount: input.amount }, { accountId: isReceipt ? party._id : bank._id, accountName: isReceipt ? party.name : bank.name, type: "Credit", amount: input.amount }] });
}
export const autoPaymentReceipt = (input) => postPayment(input, "Customer");
export const autoPaymentPaid = (input) => postPayment(input, "Supplier");
export const autoPaymentEntry = autoPaymentPaid;

// Financial documents must never be physically removed once posted. This
// creates equal-and-opposite entries while retaining the original posting, so
// every report that includes posted journals has a zero net effect and a full
// audit trail.
export async function reversePostedTransactions({ companyId, referenceIds, createdBy, date = new Date(), narration, session = null }) {
  const ids = (referenceIds || []).filter(Boolean);
  if (!ids.length) return [];
  const originals = await Transaction.find({ companyId, referenceId: { $in: ids }, status: "Posted" }).session(session);
  const reversals = [];
  for (const original of originals) {
    const reversal = await postAccountingTransaction({
      companyId,
      type: original.type,
      referenceType: original.referenceType,
      // A new source id avoids colliding with the original journal's
      // idempotency key. reversalOf preserves the audit relationship.
      referenceId: new mongoose.Types.ObjectId(),
      referenceNumber: original.referenceNumber,
      partyType: original.partyType,
      partyId: original.partyId,
      partyName: original.partyName,
      paymentMode: original.paymentMode,
      bankAccountId: original.bankAccountId,
      chequeNumber: original.chequeNumber,
      chequeDate: original.chequeDate,
      utrNumber: original.utrNumber,
      reversalOf: original._id,
      isReversal: true,
      createdBy,
      date,
      narration: narration || `Reversal of ${original.transactionNumber}`,
      lines: original.lines.map((line) => ({
        accountId: line.accountId,
        accountName: line.accountName,
        type: line.type === "Debit" ? "Credit" : "Debit",
        amount: line.amount,
      })),
      session,
    });
    reversals.push(reversal);
  }
  return reversals;
}

export async function autoGRN(input) {
  const total = money(input.amount);
  const taxAmount = Math.round(Number(input.taxAmount || 0) * 100) / 100;
  if (taxAmount < 0 || taxAmount - total > 0.001) throw new Error("GRN tax amount must be between zero and the document total");
  const value = total - taxAmount;
  if (value <= 0.001) return null;
  const [inventory, clearing] = await Promise.all([
    systemAccount(input.companyId, "Inventory / Stock", input.session),
    systemAccount(input.companyId, "Goods Received Not Invoiced", input.session),
  ]);
  return postAccountingTransaction({ ...input, amount: value, type: "Journal Entry", partyType: "Supplier", referenceType: "Manual", narration: input.narration || `Goods received ${input.referenceNumber || ""}`, lines: [{ accountId: inventory._id, accountName: inventory.name, type: "Debit", amount: value }, { accountId: clearing._id, accountName: clearing.name, type: "Credit", amount: value }] });
}

export async function autoPayrollPaid({ companyId, amount, employeeId, employeeName, payrollId, month, bankAccountId, bankAccountName, createdBy }) {
  const [salary, bank] = await Promise.all([systemAccount(companyId, "Salary Expense"), paymentAccount(companyId, bankAccountId, bankAccountName)]);
  return postAccountingTransaction({ companyId, type: "Journal Entry", createdBy, partyType: "Employee", partyId: employeeId, partyName: employeeName, referenceType: "Payroll", referenceId: payrollId, referenceNumber: month, narration: `Salary paid to ${employeeName || "employee"} for ${month}`, lines: [{ accountId: salary._id, accountName: salary.name, type: "Debit", amount }, { accountId: bank._id, accountName: bank.name, type: "Credit", amount }] });
}

export async function autoCreditNote(input) {
  const [customer, returns] = await Promise.all([partyAccount(input.companyId, "Customer", input.partyId), systemAccount(input.companyId, "Sales Returns")]);
  return postAccountingTransaction({ ...input, type: "Credit Note", partyType: "Customer", referenceType: "CreditNote", lines: [{ accountId: returns._id, accountName: returns.name, type: "Debit", amount: input.amount }, { accountId: customer._id, accountName: customer.name, type: "Credit", amount: input.amount }] });
}
export const autoDebitNote = (input) => postPartyDocument({ ...input, partyType: "Supplier", incomeAccount: "Purchase Returns", transactionType: "Debit Note", referenceType: "DebitNote", reversal: true });
