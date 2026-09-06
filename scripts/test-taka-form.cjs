// Run with: node scripts/test-taka-form.cjs
// Uses local fixtures only; never connects to the application database.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const swc = require("next/dist/build/swc");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

async function compile(filename) {
  return (await swc.transform(fs.readFileSync(filename, "utf8"), {
    filename, jsc: { parser: { syntax: "ecmascript", jsx: true }, target: "es2020", transform: { react: { runtime: "automatic" } } },
    module: { type: "commonjs" },
  })).code;
}

function evaluate(code, mocks = {}) {
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports,
  );
  return module.exports;
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  return React.isValidElement(node) ? [node, ...elements(node.props.children)] : [];
}

async function main() {
  const helpers = evaluate(await compile("src/components/textiles/taka-form-data.js"));
  const formCode = await compile("src/components/textiles/TakaForm.jsx");
  const id = "6a9956bf7c5e030e550c7d68";
  const record = {
    _id: id, companyId: "company-id", createdAt: "2026-01-01", qrCode: "existing-qr",
    takaNumber: "TAKA-0042", quantity: 35.75, weight: 0, width: null, status: "available",
    productionOrder: { _id: "100000000000000000000001", productionDocNo: "PO-OLD-42" },
    fabric: { _id: "100000000000000000000002", itemCode: "FAB-42", itemName: "Cotton" },
    lot: null, shade: null,
    warehouse: { _id: "100000000000000000000003", warehouseName: "Main store" },
  };
  const normalized = helpers.normalizeTaka(record);
  assert.equal(normalized.productionOrder, record.productionOrder._id);
  assert.equal(normalized.warehouse, record.warehouse._id);
  assert.equal(normalized.design, "");
  assert.equal(normalized.weight, 0);
  const payload = helpers.takaPayload({ ...normalized, lot: "", shade: "", warehouse: "", quantity: "35.75" });
  assert.equal(payload.lot, null);
  assert.equal(payload.warehouse, null);
  assert.equal(payload.quantity, 35.75);
  assert.equal(payload.width, null);
  assert(!("companyId" in payload));
  assert(!("qrCode" in payload));
  assert.equal(helpers.validateTaka(payload), "");
  for (const quantity of [0, -1, NaN, Infinity, null]) assert(helpers.validateTaka({ ...payload, quantity }));
  assert(helpers.validateTaka({ ...payload, weight: -1 }));
  assert(helpers.validateTaka({ ...payload, productionOrder: null }));
  assert.equal(helpers.nextTakaNumber([{ takaNumber: "TAKA-0010" }, { takaNumber: "TAKA-0002" }]), "TAKA-0011");
  console.log("PASS: populated values, cleared references, numeric validation, editable payload, next code");

  for (const metadata of ["meta", "pagination"]) {
    const pages = [];
    const records = await helpers.loadAllOptions({ get: async (_, { params }) => {
      pages.push(params.page);
      return { data: { success: true, data: [{ _id: String(params.page) }], [metadata]: { pages: 3 } } };
    } }, "/test");
    assert.deepEqual(pages, [1, 2, 3]);
    assert.equal(records.length, 3);
  }
  const saved = helpers.toOptions([], "productionOrder", record.productionOrder);
  assert.deepEqual(saved, [{ value: record.productionOrder._id, label: "PO-OLD-42" }]);
  assert.equal(helpers.toOptions([record.productionOrder], "productionOrder", record.productionOrder).length, 1);
  console.log("PASS: all result pages and saved selections outside current options");

  async function renderForm(editing, fail = false) {
    const state = [];
    const refs = [];
    let index = 0;
    let refIndex = 0;
    let effect;
    const requests = [];
    const navigations = [];
    const api = {
      get: async (url) => {
        if (fail) throw new Error("Unable to load choices");
        if (url === `/textiles/takas/${id}`) return { data: { success: true, data: record } };
        return { data: { success: true, data: url === "/textiles/takas" ? [record] : [] } };
      },
      put: async (url, data) => { requests.push({ method: "put", url, data }); return { data: { success: true } }; },
      post: async (url, data) => { requests.push({ method: "post", url, data }); return { data: { success: true } }; },
    };
    const Form = evaluate(formCode, {
      react: { ...React,
        useState: (initial) => {
          const current = index++;
          if (!(current in state)) state[current] = initial;
          return [state[current], (next) => { state[current] = typeof next === "function" ? next(state[current]) : next; }];
        },
        useEffect: (callback) => { effect = callback; },
        useRef: (initial) => { const current = refIndex++; return refs[current] ||= { current: initial }; },
      },
      "next/navigation": { useRouter: () => ({ push: (url) => navigations.push(url) }) },
      "react-toastify": { toast: { success() {}, error() {} } },
      "@/lib/api": api,
      "./taka-form-data": helpers,
    }).default;
    const render = () => { index = 0; refIndex = 0; return Form(editing ? { id } : {}); };
    render();
    const cleanup = effect();
    for (let attempt = 0; state[2] && attempt < 30; attempt++) await new Promise(setImmediate);
    assert.equal(state[2], false, "form load completed");
    return { render, requests, navigations, cleanup };
  }

  for (const editing of [true, false]) {
    const fixture = await renderForm(editing);
    let tree = fixture.render();
    const selects = elements(tree).filter((node) => node.props.isSearchable === true);
    assert.equal(selects.length, 6);
    assert.deepEqual(selects.map((node) => node.props.name).sort(), ["fabric", "lot", "productionOrder", "shade", "status", "warehouse"]);
    if (editing) {
      assert.equal(selects.find((node) => node.props.name === "productionOrder").props.value.label, "PO-OLD-42");
      assert.equal(selects.find((node) => node.props.name === "warehouse").props.value.label, "Main store");
    }
    const markup = renderToStaticMarkup(tree);
    assert.equal((markup.match(/role="combobox"/g) || []).length, 6);
    assert(!markup.includes("[object Object]"));
    for (const select of selects) {
      if (select.props.name === "warehouse") select.props.onChange(null);
      if (select.props.name === "productionOrder") select.props.onChange({ value: record.productionOrder._id });
      if (select.props.name === "fabric") select.props.onChange({ value: record.fabric._id });
    }
    elements(tree).find((node) => node.type === "input" && node.props.name === "quantity").props.onChange({ target: { name: "quantity", value: "12.5" } });
    tree = fixture.render();
    const form = elements(tree).find((node) => node.type === "form");
    await Promise.all([form.props.onSubmit({ preventDefault() {} }), form.props.onSubmit({ preventDefault() {} })]);
    assert.equal(fixture.requests.length, 1, "duplicate submissions are prevented");
    assert.equal(fixture.requests[0].method, editing ? "put" : "post");
    assert.equal(fixture.requests[0].data.warehouse, null);
    assert.equal(fixture.requests[0].data.quantity, 12.5);
    assert(!("_id" in fixture.requests[0].data));
    assert.deepEqual(fixture.navigations, ["/admin/textiles/takas"]);
    fixture.cleanup();
    console.log(`PASS: ${editing ? "Edit" : "New"} form renders six searchable controls and submits correct data once`);
  }
  const failed = await renderForm(true, true);
  const failedNodes = elements(failed.render());
  assert(failedNodes.some((node) => node.props.role === "alert"));
  assert(!failedNodes.some((node) => node.type === "form"));
  failed.cleanup();
  console.log("PASS: load failure blocks submission and offers retry");

  const productionCode = await compile("src/app/api/production-orders/route.js");
  let skip;
  let limit;
  let counts = 0;
  const query = {
    populate() { return this; }, skip(value) { skip = value; return this; },
    limit(value) { limit = value; return this; }, sort() { return this; },
    async lean() { return []; },
  };
  const productionMocks = {
    "next/server": { NextResponse: { json: (body) => body } },
    "@/lib/db": async () => {},
    "@/lib/auth": { getTokenFromHeader: () => "fixture", verifyJWT: () => ({ companyId: "company" }) },
    "@/models/ProductionOrder": { find: () => query, countDocuments: async () => { counts++; return 205; } },
  };
  // Other route imports are unrelated to GET and need no database models here.
  for (const match of productionCode.matchAll(/require\("(@\/models\/[^"\n]+)"\)/g)) {
    if (!(match[1] in productionMocks)) productionMocks[match[1]] = {};
  }
  const productionRoute = evaluate(productionCode, productionMocks);
  const pageTwo = await productionRoute.GET({ url: "http://localhost/api/production-orders?page=2&limit=100" });
  assert.equal(skip, 100);
  assert.equal(limit, 100);
  assert.equal(pageTwo.meta.pages, 3);
  const legacy = await productionRoute.GET({ url: "http://localhost/api/production-orders?limit=250" });
  assert.equal(skip, 0);
  assert.equal(limit, 250);
  assert(!("meta" in legacy));
  assert.equal(counts, 1);
  console.log("PASS: production order pagination and existing callers remain compatible");

  for (const filename of [
    "src/app/(dashboard)/admin/textiles/takas/new/page.jsx",
    "src/app/(dashboard)/admin/textiles/takas/[id]/edit/page.jsx",
    "src/app/api/production-orders/route.js", "src/app/api/textiles/takas/route.js",
    "src/app/api/textiles/takas/[id]/route.js",
  ]) await compile(filename);
  console.log("PASS: both pages and changed API routes compile");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
