const f = (name, label, type = "text", options = {}) => ({ name, label, type, ...options });

const commonStatus = ["Draft", "Approved", "In Process", "Hold", "Completed", "Rejected", "Cancelled"];

export const textileDoctypes = {
  "fabric-specification": {
    label: "Fabric Specification", category: "Masters", prefix: "FS",
    fields: [f("fabric_item", "Fabric Item", "link", { required: true, link: "Item" }), f("fabric_type", "Fabric Type", "select", { options: ["Woven", "Knitted", "Non-Woven", "Other"] }), f("construction", "Construction", "link", { link: "Fabric Construction" }), f("gsm", "GSM", "number"), f("finished_width", "Finished Width", "number"), f("width_uom", "Width UOM", "link", { link: "UOM" }), f("grey_width", "Grey Width", "number"), f("finish", "Finish", "text"), f("design", "Design", "text"), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("customer_specific", "Customer Specific", "checkbox"), f("active", "Active", "checkbox", { default: true })],
  },
  "yarn-specification": {
    label: "Yarn Specification", category: "Masters", prefix: "YS",
    fields: [f("yarn_item", "Yarn Item", "link", { required: true, link: "Item" }), f("yarn_type", "Yarn Type", "text"), f("count_system", "Count System", "select", { options: ["Ne", "Nm", "Tex", "Denier"] }), f("count", "Count", "number"), f("denier", "Denier", "number"), f("ply", "Ply", "number"), f("twist", "Twist", "text"), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("composition_template", "Composition Template", "link", { link: "Fiber / Composition Master" }), f("cone_weight", "Cone Weight", "number"), f("uom", "UOM", "link", { link: "UOM" })],
  },
  color: {
    label: "Color", category: "Masters", prefix: "CLR",
    fields: [f("color_code", "Color Code"), f("color_name", "Color Name", "text", { required: true }), f("color_family", "Color Family"), f("pantone_code", "Pantone Code"), f("hex_code", "Hex Code", "color"), f("active", "Active", "checkbox", { default: true })],
  },
  shade: {
    label: "Shade", category: "Masters", prefix: "SHD",
    fields: [f("shade_code", "Shade Code"), f("shade_name", "Shade Name", "text", { required: true }), f("color", "Color", "link", { link: "Color" }), f("customer", "Customer", "link", { link: "Customer" }), f("reference_sample", "Reference Sample", "url"), f("lab_dip_required", "Lab Dip Required", "checkbox"), f("active", "Active", "checkbox", { default: true })],
  },
  "fabric-construction": {
    label: "Fabric Construction", category: "Masters", prefix: "FC",
    fields: [f("construction_code", "Construction Code"), f("construction_name", "Construction Name"), f("type", "Type", "select", { options: ["Woven", "Knitted"] }), f("warp_count", "Warp Count"), f("weft_count", "Weft Count"), f("epi", "EPI", "number"), f("ppi", "PPI", "number"), f("gauge", "Gauge", "number"), f("diameter", "Diameter", "number"), f("stitch_length", "Stitch Length", "number")],
  },
  "fiber-composition-master": {
    label: "Fiber / Composition Master", category: "Masters", prefix: "CMP",
    fields: [f("composition_name", "Composition Name", "text", { required: true }), f("components", "Composition", "table", { required: true, columns: [f("fiber", "Fiber", "link", { link: "Item / Fiber Master", required: true }), f("percentage", "Percentage", "number", { required: true }), f("recycled", "Recycled", "checkbox"), f("certification", "Certification")] }), f("active", "Active", "checkbox", { default: true })],
  },
  "textile-process": {
    label: "Textile Process", category: "Masters", prefix: "TP",
    fields: [f("process_code", "Process Code"), f("process_name", "Process Name", "text", { required: true }), f("department", "Department", "link", { link: "Department" }), f("process_type", "Process Type"), f("sequence", "Sequence", "number"), f("input_uom", "Input UOM", "link", { link: "UOM" }), f("output_uom", "Output UOM", "link", { link: "UOM" }), f("expected_loss_percent", "Expected Loss %", "number"), f("machine_required", "Machine Required", "checkbox"), f("quality_required", "Quality Required", "checkbox"), f("subcontractable", "Subcontractable", "checkbox"), f("active", "Active", "checkbox", { default: true })],
  },
  machine: {
    label: "Machine", category: "Masters", prefix: "MCH",
    fields: [f("machine_id", "Machine ID"), f("machine_name", "Machine Name", "text", { required: true }), f("machine_type", "Machine Type"), f("department", "Department", "link", { link: "Department" }), f("workstation", "Workstation", "link", { link: "Workstation" }), f("capacity", "Capacity", "number"), f("capacity_uom", "Capacity UOM", "link", { link: "UOM" }), f("manufacturer", "Manufacturer"), f("model", "Model"), f("serial_no", "Serial No"), f("power_kw", "Power (kW)", "number"), f("hourly_cost", "Hourly Cost", "currency"), f("status", "Status", "select", { options: ["Active", "Maintenance", "Idle", "Retired"] })],
  },
  skill: {
    label: "Skill", category: "Masters", prefix: "SKL",
    fields: [f("skill_code", "Skill Code"), f("skill_name", "Skill Name", "text", { required: true }), f("skill_category", "Skill Category"), f("description", "Description", "textarea"), f("active", "Active", "checkbox", { default: true })],
  },
  "employee-skill": {
    label: "Employee Skill", category: "Masters", prefix: "ES",
    fields: [f("employee", "Employee", "link", { link: "Employee", required: true }), f("skill", "Skill", "link", { link: "Skill", required: true }), f("skill_level", "Skill Level", "select", { options: ["Trainee", "Beginner", "Intermediate", "Advanced", "Expert"] }), f("experience_years", "Experience (Years)", "number"), f("certification", "Certification"), f("valid_until", "Valid Until", "date")],
  },
  "customer-fabric-requirement": {
    label: "Customer Fabric Requirement", category: "Sales & Samples", prefix: "CFR",
    fields: [f("customer", "Customer", "link", { link: "Customer", required: true }), f("fabric", "Fabric", "link", { link: "Item", required: true }), f("construction", "Construction", "link", { link: "Fabric Construction" }), f("composition", "Composition", "table", { columns: [f("fiber", "Fiber", "link", { link: "Item / Fiber Master" }), f("percentage", "Percentage", "number"), f("recycled", "Recycled", "checkbox"), f("certification", "Certification")] }), f("gsm", "GSM", "number"), f("gsm_tolerance", "GSM Tolerance", "number"), f("width", "Width", "number"), f("width_tolerance", "Width Tolerance", "number"), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("finish", "Finish"), f("packing_type", "Packing Type", "select", { options: ["Roll", "Bale", "Carton", "Folded", "Other"] }), f("testing_requirement", "Testing Requirement", "textarea"), f("delivery_requirement", "Delivery Requirement", "date")],
  },
  "lab-dip": {
    label: "Lab Dip", category: "Sales & Samples", prefix: "LD",
    statuses: ["Draft", "Submitted", "Approved", "Rejected", "Rework"],
    actions: [{ label: "Create Recipe", create: "dyeing-recipe" }, { label: "Submit Sample", status: "Submitted" }, { label: "Approve", status: "Approved" }, { label: "Reject", status: "Rejected" }, { label: "Create Dyeing Order", create: "dyeing-order" }],
    fields: [f("lab_dip_no", "Lab Dip No"), f("customer", "Customer", "link", { link: "Customer", required: true }), f("fabric", "Fabric", "link", { link: "Item", required: true }), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("recipe", "Dyeing Recipe", "link", { link: "Dyeing Recipe" }), f("sample_date", "Sample Date", "date"), f("submitted_date", "Submitted Date", "date"), f("approval_status", "Approval Status", "select", { options: ["Draft", "Submitted", "Approved", "Rejected", "Rework"] }), f("approval_date", "Approval Date", "date"), f("remarks", "Remarks", "textarea")],
  },
  "sample-request": {
    label: "Sample Request", category: "Sales & Samples", prefix: "SMP",
    fields: [f("sample_no", "Sample No"), f("customer", "Customer", "link", { link: "Customer", required: true }), f("sales_order", "Sales Order", "link", { link: "Sales Order" }), f("sample_type", "Sample Type", "select", { options: ["Lab Dip", "Fabric Sample", "Color Sample", "Print Sample", "Strike-off", "Proto", "Bulk Sample"] }), f("fabric", "Fabric", "link", { link: "Item" }), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("quantity", "Quantity", "number"), f("required_date", "Required Date", "date"), f("approval_status", "Approval Status", "select", { options: ["Draft", "Submitted", "Approved", "Rejected", "Rework"] }), f("customer_remarks", "Customer Remarks", "textarea")],
  },
  "shade-approval": {
    label: "Shade Approval", category: "Sales & Samples", prefix: "SA",
    statuses: ["Draft", "Submitted", "Approved", "Rejected", "Rework"],
    fields: [f("customer", "Customer", "link", { link: "Customer", required: true }), f("lab_dip", "Lab Dip", "link", { link: "Lab Dip" }), f("fabric", "Fabric", "link", { link: "Item" }), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("sample_reference", "Sample Reference"), f("submitted_date", "Submitted Date", "date"), f("approval_status", "Approval Status", "select", { options: ["Draft", "Submitted", "Approved", "Rejected", "Rework"] }), f("approval_date", "Approval Date", "date"), f("remarks", "Remarks", "textarea")],
  },
  "dyeing-recipe": {
    label: "Dyeing Recipe (Specification)", category: "Processing", prefix: "DR",
    statuses: ["Draft", "Approved", "Obsolete"],
    fields: [f("recipe_no", "Recipe No"), f("fabric", "Fabric", "link", { link: "Item", required: true }), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("machine_type", "Machine Type"), f("liquor_ratio", "Liquor Ratio", "number"), f("temperature", "Temperature", "number"), f("total_time_minutes", "Total Time (Minutes)", "number"), f("approved_by", "Approved By", "link", { link: "User" }), f("recipe_materials", "Recipe Materials", "table", { columns: [f("material", "Material", "link", { link: "Item", required: true }), f("material_type", "Material Type", "select", { options: ["Dye", "Chemical"] }), f("dosage", "Dosage", "number"), f("dosage_uom", "Dosage UOM", "link", { link: "UOM" }), f("stage", "Stage"), f("addition_time", "Addition Time"), f("temperature", "Temperature", "number")] })],
  },
  "textile-production-plan": {
    label: "Textile Production Plan", category: "Manufacturing", prefix: "TPP",
    statuses: ["Draft", "Planned", "Material Ready", "In Production", "Completed", "Closed"],
    actions: [{ label: "Get Sales Orders" }, { label: "Calculate Material" }, { label: "Check Stock" }, { label: "Create Material Request" }, { label: "Create Work Orders" }, { label: "Start Production", status: "In Production" }, { label: "Complete", status: "Completed" }],
    fields: [f("production_plan_no", "Production Plan No"), f("company", "Company", "link", { link: "Company", required: true }), f("plant", "Plant", "link", { link: "Warehouse / Location", required: true }), f("sales_order", "Sales Order", "link", { link: "Sales Order" }), f("customer", "Customer", "link", { link: "Customer" }), f("priority", "Priority", "select", { required: true, options: ["Low", "Normal", "High", "Urgent"] }), f("required_date", "Required Date", "date", { required: true }), f("production_items", "Production Items", "table", { columns: [f("item", "Item", "link", { link: "Item", required: true }), f("fabric_specification", "Fabric Specification", "link", { link: "Fabric Specification" }), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("gsm", "GSM", "number"), f("width", "Width", "number"), f("quantity", "Quantity", "number", { required: true }), f("uom", "UOM", "link", { link: "UOM" }), f("sales_order_item", "Sales Order Item")] })],
  },
  "production-batch": {
    label: "Production Batch", category: "Manufacturing", prefix: "PB",
    fields: [f("batch_no", "Batch No"), f("item", "Item", "link", { link: "Item", required: true }), f("production_plan", "Production Plan", "link", { link: "Textile Production Plan" }), f("work_order", "Work Order", "link", { link: "Work Order" }), f("input_qty", "Input Qty", "number"), f("output_qty", "Output Qty", "number"), f("wastage_qty", "Wastage Qty", "number"), f("rejected_qty", "Rejected Qty", "number"), f("machine", "Machine", "link", { link: "Machine" }), f("operator", "Operator", "link", { link: "Employee" }), f("start_time", "Start Time", "datetime-local"), f("end_time", "End Time", "datetime-local")],
  },
  "process-order": {
    label: "Process Order", category: "Manufacturing", prefix: "PO",
    statuses: ["Draft", "Planned", "In Process", "Paused", "QC", "Completed", "Cancelled"],
    actions: [{ label: "Start", status: "In Process" }, { label: "Pause", status: "Paused" }, { label: "Send to QC", status: "QC" }, { label: "Complete", status: "Completed" }],
    fields: [f("process", "Process", "link", { link: "Textile Process", required: true }), f("production_batch", "Production Batch", "link", { link: "Production Batch" }), f("input_item", "Input Item", "link", { link: "Item" }), f("output_item", "Output Item", "link", { link: "Item" }), f("input_qty", "Input Qty", "number"), f("planned_output_qty", "Planned Output Qty", "number"), f("actual_output_qty", "Actual Output Qty", "number"), f("wastage_qty", "Wastage Qty", "number"), f("machine", "Machine", "link", { link: "Machine" }), f("operator", "Operator", "link", { link: "Employee" }), f("source_warehouse", "Source Warehouse", "link", { link: "Warehouse" }), f("target_warehouse", "Target Warehouse", "link", { link: "Warehouse" }), f("planned_start", "Planned Start", "datetime-local"), f("planned_end", "Planned End", "datetime-local"), f("actual_start", "Actual Start", "datetime-local"), f("actual_end", "Actual End", "datetime-local")],
  },
  "dyeing-order": { label: "Dyeing Order", category: "Processing", prefix: "DO", statuses: ["Draft", "Planned", "In Process", "QC", "Completed", "Cancelled"], actions: [{ label: "Start", status: "In Process" }, { label: "Send to QC", status: "QC" }, { label: "Complete", status: "Completed" }], fields: [f("fabric", "Fabric", "link", { link: "Item", required: true }), f("batch", "Batch", "link", { link: "Batch" }), f("recipe", "Dyeing Recipe", "link", { link: "Dyeing Recipe", required: true }), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("input_qty", "Input Qty", "number", { required: true }), f("output_qty", "Output Qty", "number"), f("uom", "UOM", "link", { link: "UOM" }), f("machine", "Machine", "link", { link: "Machine" }), f("operator", "Operator", "link", { link: "Employee" }), f("source_warehouse", "Source Warehouse", "link", { link: "Warehouse" }), f("target_warehouse", "Target Warehouse", "link", { link: "Warehouse" }), f("planned_start", "Planned Start", "datetime-local"), f("planned_end", "Planned End", "datetime-local"), f("actual_start", "Actual Start", "datetime-local"), f("actual_end", "Actual End", "datetime-local"), f("remarks", "Remarks", "textarea")] },
  "printing-order": { label: "Printing Order", category: "Processing", prefix: "PRN", statuses: ["Draft", "Planned", "In Process", "QC", "Completed", "Cancelled"], fields: [f("fabric", "Fabric", "link", { link: "Item", required: true }), f("batch", "Batch", "link", { link: "Batch" }), f("design", "Print Design"), f("colorways", "Colorways", "textarea"), f("input_qty", "Input Qty", "number", { required: true }), f("output_qty", "Output Qty", "number"), f("uom", "UOM", "link", { link: "UOM" }), f("machine", "Machine", "link", { link: "Machine" }), f("operator", "Operator", "link", { link: "Employee" }), f("source_warehouse", "Source Warehouse", "link", { link: "Warehouse" }), f("target_warehouse", "Target Warehouse", "link", { link: "Warehouse" }), f("materials", "Ink / Chemicals", "table", { columns: [f("material", "Material", "link", { link: "Item" }), f("qty", "Qty", "number"), f("uom", "UOM", "link", { link: "UOM" })] }), f("planned_start", "Planned Start", "datetime-local"), f("planned_end", "Planned End", "datetime-local"), f("remarks", "Remarks", "textarea")] },
  "finishing-order": { label: "Finishing Order", category: "Processing", prefix: "FIN", statuses: ["Draft", "Planned", "In Process", "QC", "Completed", "Cancelled"], fields: [f("fabric", "Fabric", "link", { link: "Item", required: true }), f("batch", "Batch", "link", { link: "Batch" }), f("finish", "Finish", "text", { required: true }), f("input_qty", "Input Qty", "number", { required: true }), f("output_qty", "Output Qty", "number"), f("uom", "UOM", "link", { link: "UOM" }), f("machine", "Machine", "link", { link: "Machine" }), f("operator", "Operator", "link", { link: "Employee" }), f("target_gsm", "Target GSM", "number"), f("target_width", "Target Width", "number"), f("materials", "Finish Chemicals", "table", { columns: [f("material", "Material", "link", { link: "Item" }), f("qty", "Qty", "number"), f("uom", "UOM", "link", { link: "UOM" })] }), f("source_warehouse", "Source Warehouse", "link", { link: "Warehouse" }), f("target_warehouse", "Target Warehouse", "link", { link: "Warehouse" }), f("planned_start", "Planned Start", "datetime-local"), f("planned_end", "Planned End", "datetime-local"), f("remarks", "Remarks", "textarea")] },
  "fabric-roll": {
    label: "Fabric Roll", category: "Rolls & Dispatch", prefix: "ROLL",
    statuses: ["Available", "Reserved", "Partially Sold", "Sold", "Rejected", "Hold", "Returned"],
    actions: [{ label: "Print Label" }, { label: "Print QR" }, { label: "Reserve", status: "Reserved" }, { label: "Release Reservation", status: "Available" }, { label: "Split Roll", create: "roll-split" }, { label: "Merge Roll" }, { label: "Transfer", create: "roll-transfer" }, { label: "Adjust Quantity" }, { label: "Quality Inspection", create: "fabric-inspection" }, { label: "Pack", create: "roll-packing" }, { label: "Deliver", status: "Sold" }, { label: "Return", status: "Returned" }],
    fields: [f("roll_id", "Roll ID"), f("item", "Item", "link", { link: "Item", required: true }), f("fabric_specification", "Fabric Specification", "link", { link: "Fabric Specification" }), f("batch", "Batch", "link", { link: "Batch" }), f("lot", "Lot", "link", { link: "Batch" }), f("color", "Color", "link", { link: "Color" }), f("shade", "Shade", "link", { link: "Shade" }), f("gsm", "GSM", "number"), f("width", "Width", "number"), f("length", "Length", "number", { required: true }), f("weight", "Weight", "number"), f("quality_grade", "Quality Grade", "select", { options: ["A", "A-", "B", "C", "Reject"] }), f("warehouse", "Warehouse", "link", { link: "Warehouse" }), f("rack", "Rack / Bin"), f("qr_code", "QR Code")],
  },
  "roll-split": {
    label: "Roll Split", category: "Rolls & Dispatch", prefix: "RS",
    fields: [f("source_roll", "Source Roll", "link", { link: "Fabric Roll", required: true }), f("split_quantity", "Split Quantity", "number", { required: true }), f("split_uom", "Split UOM", "link", { link: "UOM" }), f("new_roll_id", "New Roll ID"), f("reason", "Reason", "select", { options: ["Sale", "Sample", "Rework", "Transfer", "Adjustment"] }), f("transaction_date", "Transaction Date", "datetime-local")],
  },
  "roll-transfer": {
    label: "Roll Transfer", category: "Rolls & Dispatch", prefix: "RT",
    fields: [f("roll", "Roll", "link", { link: "Fabric Roll", required: true }), f("source_warehouse", "Source Warehouse", "link", { link: "Warehouse", required: true }), f("target_warehouse", "Target Warehouse", "link", { link: "Warehouse", required: true }), f("source_rack", "Source Rack"), f("target_rack", "Target Rack"), f("transfer_date", "Transfer Date", "datetime-local"), f("quantity", "Quantity", "number"), f("uom", "UOM", "link", { link: "UOM" }), f("remarks", "Remarks", "textarea")],
  },
  "roll-packing": {
    label: "Roll Packing", category: "Rolls & Dispatch", prefix: "PKG",
    fields: [f("packing_no", "Packing No"), f("customer", "Customer", "link", { link: "Customer" }), f("delivery_note", "Delivery Note", "link", { link: "Delivery Note" }), f("rolls", "Rolls", "table", { columns: [f("roll", "Roll", "link", { link: "Fabric Roll" }), f("length", "Length", "number"), f("weight", "Weight", "number"), f("quality_grade", "Grade")] }), f("carton_bale_no", "Carton / Bale No"), f("package_count", "Package Count", "number"), f("gross_weight", "Gross Weight", "number"), f("net_weight", "Net Weight", "number"), f("dimensions", "Dimensions"), f("transporter", "Transporter", "link", { link: "Supplier" }), f("vehicle_no", "Vehicle No"), f("lr_no", "LR No"), f("eway_bill_no", "E-Way Bill No")],
  },
  "fabric-inspection": {
    label: "Fabric Inspection", category: "Quality", prefix: "FI",
    statuses: ["Pending", "Passed", "Failed", "Hold", "Rework"],
    actions: [{ label: "Pass", status: "Passed" }, { label: "Fail", status: "Failed" }, { label: "Hold", status: "Hold" }, { label: "Create Rework", create: "rework-order" }],
    fields: [f("inspection_no", "Inspection No"), f("roll", "Roll", "link", { link: "Fabric Roll", required: true }), f("item", "Item", "link", { link: "Item" }), f("batch", "Batch", "link", { link: "Batch" }), f("inspector", "Inspector", "link", { link: "Employee" }), f("inspection_date", "Inspection Date", "date"), f("length", "Length", "number"), f("width", "Width", "number"), f("gsm", "GSM", "number"), f("quality_grade", "Quality Grade", "select", { options: ["A", "A-", "B", "C", "Reject"] }), f("scoring_basis", "4-Point Scoring Basis", "select", { options: ["Per Area", "Per Length"] }), f("area_or_length", "Area / Length", "number"), f("total_points", "Total Defect Points", "number", { readOnly: true }), f("inspection_score", "Points per Area / Length", "number", { readOnly: true }), f("defects", "Defects", "table", { columns: [f("defect", "Defect", "link", { link: "Fabric Defect" }), f("position", "Position"), f("points", "Points", "number"), f("severity", "Severity", "select", { options: ["Minor", "Major", "Critical"] }), f("remarks", "Remarks")] })],
  },
  "fabric-defect": {
    label: "Fabric Defect", category: "Quality", prefix: "DEF",
    fields: [f("defect_code", "Defect Code"), f("defect_name", "Defect Name", "text", { required: true }), f("category", "Category", "select", { options: ["Weaving", "Dyeing", "Printing", "Finishing"] }), f("severity", "Severity", "select", { options: ["Minor", "Major", "Critical"] }), f("default_points", "Default Points", "number"), f("active", "Active", "checkbox", { default: true })],
  },
  "rework-order": {
    label: "Rework Order", category: "Quality", prefix: "RW",
    actions: [{ label: "Start Rework", status: "In Process" }, { label: "Complete", status: "Completed" }, { label: "Quality Inspection", create: "fabric-inspection" }],
    fields: [f("roll", "Roll", "link", { link: "Fabric Roll" }), f("reason", "Reason", "textarea", { required: true }), f("defect", "Defect", "link", { link: "Fabric Defect" }), f("process", "Process", "link", { link: "Textile Process" }), f("input_qty", "Input Qty", "number"), f("expected_output", "Expected Output", "number"), f("department", "Department", "link", { link: "Department" }), f("machine", "Machine", "link", { link: "Machine" }), f("disposition", "Disposition", "select", { options: ["Rework", "Downgrade", "Scrap", "Return to Supplier", "Sell as Seconds"] })],
  },
  "job-work-order": {
    label: "Job Work Order", category: "Job Work", prefix: "JW",
    statuses: ["Draft", "Approved", "Material Issued", "At Job Worker", "Partially Received", "Fully Received", "QC", "Closed"],
    actions: [{ label: "Approve", status: "Approved" }, { label: "Create Material Issue", create: "job-work-material-issue" }, { label: "Send to Job Worker", status: "At Job Worker" }, { label: "Create Receipt", create: "job-work-receipt" }, { label: "Receive Processed Material", status: "Partially Received" }, { label: "Create Quality Inspection", create: "fabric-inspection" }, { label: "Create Purchase Invoice" }, { label: "Close", status: "Closed" }],
    fields: [f("job_work_no", "Job Work No"), f("job_worker", "Job Worker", "link", { link: "Supplier", required: true }), f("process", "Process", "link", { link: "Textile Process", required: true }), f("source_warehouse", "Source Warehouse", "link", { link: "Warehouse" }), f("target_warehouse", "Target Warehouse", "link", { link: "Warehouse" }), f("issue_date", "Issue Date", "date"), f("expected_return_date", "Expected Return Date", "date"), f("issued_total", "Material Issued", "number", { readOnly: true }), f("received_total", "Material Received", "number", { readOnly: true }), f("variance", "Variance", "number", { readOnly: true }), f("materials", "Materials", "table", { columns: [f("item", "Item", "link", { link: "Item" }), f("batch", "Batch", "link", { link: "Batch" }), f("qty", "Qty", "number"), f("uom", "UOM", "link", { link: "UOM" }), f("rate", "Rate", "currency"), f("amount", "Amount", "currency")] }), f("returns", "Returns", "table", { columns: [f("finished_item", "Finished Item", "link", { link: "Item" }), f("received_qty", "Received Qty", "number"), f("rejected_qty", "Rejected Qty", "number"), f("wastage_qty", "Wastage Qty", "number"), f("short_qty", "Short Qty", "number"), f("batch", "Batch", "link", { link: "Batch" })] })],
  },
  "job-work-material-issue": {
    label: "Job Work Material Issue", category: "Job Work", prefix: "JWMI",
    fields: [f("job_work_order", "Job Work Order", "link", { link: "Job Work Order", required: true }), f("job_worker", "Job Worker", "link", { link: "Supplier" }), f("source_warehouse", "Source Warehouse", "link", { link: "Warehouse" }), f("issue_date", "Issue Date", "date"), f("materials", "Materials", "table", { columns: [f("item", "Item", "link", { link: "Item" }), f("batch", "Batch", "link", { link: "Batch" }), f("qty", "Qty", "number"), f("uom", "UOM", "link", { link: "UOM" }), f("rate", "Rate", "currency"), f("amount", "Amount", "currency")] }), f("stock_entry_reference", "Stock Entry Reference"), f("remarks", "Remarks", "textarea")],
  },
  "job-work-receipt": {
    label: "Job Work Receipt", category: "Job Work", prefix: "JWR",
    fields: [f("job_work_order", "Job Work Order", "link", { link: "Job Work Order", required: true }), f("job_worker", "Job Worker", "link", { link: "Supplier" }), f("target_warehouse", "Target Warehouse", "link", { link: "Warehouse" }), f("receipt_date", "Receipt Date", "date"), f("returns", "Processed Material", "table", { columns: [f("finished_item", "Finished Item", "link", { link: "Item" }), f("received_qty", "Received Qty", "number"), f("rejected_qty", "Rejected Qty", "number"), f("wastage_qty", "Wastage Qty", "number"), f("short_qty", "Short Qty", "number"), f("batch", "Batch", "link", { link: "Batch" })] }), f("stock_entry_reference", "Stock Entry Reference"), f("quality_inspection", "Quality Inspection", "link", { link: "Fabric Inspection" }), f("remarks", "Remarks", "textarea")],
  },
  "production-cost-sheet": {
    label: "Production Cost Sheet", category: "Costing", prefix: "PCS",
    fields: [f("production_batch", "Production Batch", "link", { link: "Production Batch" }), f("fabric_roll", "Fabric Roll", "link", { link: "Fabric Roll" }), f("quantity", "Production Quantity", "number"), f("uom", "UOM", "link", { link: "UOM" }), f("materials", "Material Cost", "table", { columns: [f("item", "Item", "link", { link: "Item" }), f("qty", "Qty", "number"), f("rate", "Rate", "currency"), f("amount", "Amount", "currency")] }), f("labour", "Labour Cost", "table", { columns: [f("employee_or_skill", "Employee / Skill"), f("hours", "Hours", "number"), f("rate", "Rate", "currency"), f("amount", "Amount", "currency")] }), f("machines", "Machine Cost", "table", { columns: [f("machine", "Machine", "link", { link: "Machine" }), f("hours", "Hours", "number"), f("hourly_rate", "Hourly Rate", "currency"), f("amount", "Amount", "currency")] }), f("job_work", "Job Work Cost", "table", { columns: [f("job_worker", "Job Worker", "link", { link: "Supplier" }), f("process", "Process", "link", { link: "Textile Process" }), f("qty", "Qty", "number"), f("rate", "Rate", "currency"), f("amount", "Amount", "currency")] }), f("utilities", "Utilities", "table", { columns: [f("utility", "Electricity / Water / Steam"), f("qty_or_hours", "Qty / Hours", "number"), f("rate", "Rate", "currency"), f("amount", "Amount", "currency")] }), f("overheads", "Overhead", "table", { columns: [f("cost_center", "Cost Center", "link", { link: "Cost Center" }), f("allocation_basis", "Allocation Basis"), f("amount", "Amount", "currency")] }), f("by_products", "By-product Recovery", "table", { columns: [f("item", "Item", "link", { link: "Item" }), f("qty", "Qty", "number"), f("recovery_value", "Recovery Value", "currency")] }), f("net_production_cost", "Net Production Cost", "currency", { readOnly: true })],
  },
};

export function getTextileDoctype(slug) {
  return textileDoctypes[slug] || null;
}

export function getStatusOptions(config) {
  return config.statuses || commonStatus;
}

export function getDoctypeGroups() {
  return Object.entries(textileDoctypes).reduce((groups, [slug, config]) => {
    (groups[config.category] ||= []).push({ slug, ...config });
    return groups;
  }, {});
}
