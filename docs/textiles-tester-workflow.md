# Textile Module — Tester Workflow

## Purpose

Use this script to test the textile production flow end-to-end. Record the created document numbers, lot numbers, roll/taka IDs, and screenshots for every failed step.

## Test data

Create or select the following before starting:

| Data | Example |
|---|---|
| Supplier / job worker | `Test Dyeing Vendor` |
| Customer | `Test Textile Customer` |
| Warehouse | `Main Store`, `Production Floor`, `Vendor Location` |
| Raw material | `RM-COTTON-01` — Cotton Yarn |
| Finished product | `FG-FABRIC-01` — Dyed Cotton Fabric |
| UOM | Kg, Metre, Roll |
| Quantity | 100 Kg input, 95 Kg expected output, 5 Kg waste |

Use a fresh product/lot code for each execution. Do not use production data for destructive tests.

## 1. Master setup

1. Open **Textiles → Products** and confirm textile raw materials and finished products can be searched and opened.
2. Open **Textiles → Designs**; create a design for the finished product.
3. Open **Shade Card** and create/select a shade.
4. Open **Quality Parameters** and create parameters such as GSM, width, shade, and defects.
5. Open **Routings** and create the production sequence, for example: Weaving → Dyeing → Finishing → QC.
6. Open **Textile BOM** and create a BOM for the finished product using the raw material.

Expected result: records save successfully, appear in their lists, remain searchable, and can be reopened without losing linked product/design/shade/routing data.

## 2. Lot, roll, and production setup

1. Go to **Lot Tracking** and create a lot for the raw material.
2. Go to **Lot Assignment** and assign the lot to the production/required quantity.
3. Go to **Taka / Rolls** and create a taka/roll linked to the lot and product.
4. Open the created taka/roll detail and verify the lot, product, quantity, warehouse, and current status are correct.
5. In **Traceability**, search by the taka/roll ID and verify the same parent lot and product are shown.

Expected result: each linked record is visible from its related screen; no duplicate roll or lot identifier is created.

## 3. Job-work flow

1. Create a **Job Work Request** for the selected vendor, product/roll, process, quantity, and source/destination warehouse.
2. Submit the request, then approve it using an authorised user.
3. Create a **Job Work Challan** from the approved request and issue it.
4. Open **Vendor Stock** and verify the issued quantity is visible against the vendor.
5. Create a **Job Work Receipt** from the challan. Receive less quantity than issued for the first run (for example, issue 100 Kg and receive 95 Kg), and enter waste/rejection if the screen provides it.
6. Verify vendor stock reduces by the received/returned quantity and the challan/request status updates correctly.

Expected result: a challan cannot be issued before approval; received quantity cannot exceed issued quantity; cancelled requests/challans cannot be received; vendor stock, roll status, and WIP remain consistent.

## 4. Production and QC

1. Create or open **Weaving WIP** for the product and record input, output, and waste quantities.
2. Create/open **Greige Folding** if this process applies, and link the correct rolls/lots.
3. Open **Process WIP** and verify the current quantity and stage.
4. Create a **QC Inspection** for the completed roll/taka. Test one pass result and one fail/rework result.
5. Open **Defect Analytics** and confirm the QC defects appear with the right quantity/category.

Expected result: invalid negative quantities, output above available input, and QC submissions without required values must be rejected. Passed/failed status must be visible in roll/taka traceability.

## 5. Costing, MRP, and sales integration

1. Open **Costing** and generate costing from a taka/roll where supported.
2. Confirm material, process/job-work, wastage, and total cost are displayed consistently.
3. Run **MRP** for a product and verify shortages/recommendations use the BOM and available stock.
4. Open **Sales Order Integration**, link a sales order to production, and verify the required product, quantity, customer, and status are displayed.

Expected result: no duplicate costing is created by a repeat click; cost totals are non-negative; MRP does not allocate more inventory than available; sales-order links are traceable back to the order.

## 6. Traceability, export, and reports

1. In **Traceability**, search by lot, taka/roll, design, and product. Verify every upstream/downstream document is shown.
2. Open **Inventory Valuation** and verify quantity/value for the selected lot/product.
3. Open **Supplier Performance** and verify issued, received, delay, and quality figures for the test vendor.
4. Open **Reports** and check waste, shade sales, and flow reports using a date range containing the test data.
5. Create an **Export Document** for an eligible record and verify the linked product/lot data is correct.

Expected result: every report filters by the selected company and date range; totals match the source documents; exported/downloaded data contains the correct identifiers.

## Negative and security tests

- Try creating a record without required fields; the screen must show a useful validation message and save nothing.
- Try selecting a product, lot, supplier, or warehouse from another company; it must not be visible or accepted.
- Refresh every newly saved detail page; data must persist.
- Double-click Save/Submit/Issue; only one document or stock movement must be created.
- Try changing or deleting a lot/roll that already has downstream transactions; the system should block it or preserve traceability.
- Check mobile/tablet layout for list, create, edit, and detail screens.

## Defect report format

For every issue send: module/page URL, user role, test data IDs, exact steps, expected result, actual result, screenshot/video, browser/device, and API/console error (if any).
