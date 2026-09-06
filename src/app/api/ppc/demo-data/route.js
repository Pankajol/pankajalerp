import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Machine from "@/models/ppc/machineModel";
import Operator from "@/models/ppc/operatorModel";
import Operation from "@/models/ppc/operationModel";
import Resource from "@/models/ppc/resourceModel";
import OperatorMachineMapping from "@/models/ppc/operatorMachineMappingModel";
import ProductionOrder from "@/models/ppc/ProductionOrder";
import ProductionJobCard from "@/models/ppc/ProductionJobCard";
import Downtime from "@/models/ppc/downtimeModel";
import Holiday from "@/models/ppc/holidayModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const permitted = (user) => user?.type === "company" || user?.roles?.some(role => ["admin", "production head"].includes(role.toLowerCase()));
const upsert = (Model, filter, set) => Model.findOneAndUpdate(filter, { $setOnInsert: set }, { new: true, upsert: true, setDefaultsOnInsert: true });

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!permitted(user)) return NextResponse.json({ success: false, message: "Only Admin or Production Head can load demo data" }, { status: 403 });
    if (!mongoose.Types.ObjectId.isValid(user.companyId)) return NextResponse.json({ success: false, message: "Invalid company" }, { status: 400 });
    const companyId = new mongoose.Types.ObjectId(user.companyId), actor = user.id || user._id, prefix = `DEMO-${String(companyId).slice(-5).toUpperCase()}`;
    const machines = await Promise.all(Array.from({ length: 5 }, (_, i) => upsert(Machine, { companyId, code: `${prefix}-M${i + 1}` }, { companyId, createdBy: actor, code: `${prefix}-M${i + 1}`, name: `Demo CNC Machine ${i + 1}`, model: `CNC-${400 + i}`, brandName: "Demo Manufacturing", productionCapacity: `${80 + i * 10} units/day`, status: "Active" })));
    const operators = await Promise.all(Array.from({ length: 5 }, (_, i) => upsert(Operator, { companyId, operatorCode: `${prefix}-O${i + 1}` }, { companyId, createdBy: actor, operatorCode: `${prefix}-O${i + 1}`, name: `Demo Operator ${i + 1}`, cost: 180 + i * 20 })));
    const operations = await Promise.all(["Cutting", "Machining", "Assembly", "Finishing", "Packing"].map((name, i) => upsert(Operation, { companyId, code: `${prefix}-OP${i + 1}` }, { companyId, createdBy: actor, code: `${prefix}-OP${i + 1}`, name, cost: 100 + i * 25 })));
    const resources = await Promise.all(Array.from({ length: 5 }, (_, i) => upsert(Resource, { companyId, code: `${prefix}-R${i + 1}` }, { companyId, createdBy: actor, code: `${prefix}-R${i + 1}`, name: `Demo Tool Set ${i + 1}`, unitPrice: 500 + i * 100 })));
    await Promise.all(machines.map((machine, i) => upsert(OperatorMachineMapping, { companyId, machine: machine._id, operator: operators[i]._id }, { companyId, createdBy: actor, machine: machine._id, operator: operators[i]._id })));
    const statuses = ["Pending", "Released", "In Progress", "Completed", "On Hold"];
    const orders = await Promise.all(Array.from({ length: 5 }, (_, i) => upsert(ProductionOrder, { companyId, orderNumber: `${prefix}-PO${i + 1}` }, { companyId, createdBy: actor, orderNumber: `${prefix}-PO${i + 1}`, itemCode: `DEMO-ITEM-${i + 1}`, itemName: `Demo Product ${i + 1}`, quantity: 100 + i * 50, status: statuses[i], assignedMachine: machines[i]._id, assignedOperator: operators[i]._id, assignedResource: resources[i]._id })));
    const cardStatuses = ["Planned", "In Progress", "QC", "Completed", "Delivered"];
    await Promise.all(orders.map((order, i) => upsert(ProductionJobCard, { companyId, jobCardNo: `${prefix}-JC${i + 1}` }, { companyId, createdBy: actor, jobCardNo: `${prefix}-JC${i + 1}`, productionOrder: order._id, itemCode: order.itemCode, itemName: order.itemName, quantity: order.quantity, machine: machines[i]._id, operator: operators[i]._id, status: cardStatuses[i], actualStartDate: new Date(Date.now() - (i + 2) * 86400000), actualEndDate: i >= 3 ? new Date(Date.now() - i * 86400000) : undefined, totalDuration: (i + 1) * 7200, steps: [{ stepName: operations[i].name, status: i >= 3 ? "completed" : "in_progress", machine: machines[i].name, operator: operators[i].name }] })));
    await Promise.all(Array.from({ length: 5 }, (_, i) => { const from = new Date(Date.now() - (i + 1) * 86400000 - 2 * 3600000); const minutes = 20 + i * 10; const to = new Date(from.getTime() + minutes * 60000); return upsert(Downtime, { companyId, machine: machines[i]._id, fromTime: from }, { companyId, machine: machines[i]._id, operator: operators[i]._id, fromTime: from, toTime: to, durationMinutes: minutes, stopReason: ["Tool change", "Maintenance", "Material shortage", "Power check", "Quality adjustment"][i], remarks: "Demo downtime record" }); }));
    await Promise.all(Array.from({ length: 5 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() + i + 5); date.setHours(0, 0, 0, 0); return upsert(Holiday, { companyId, name: `${prefix} Planning Holiday ${i + 1}` }, { companyId, createdBy: actor, name: `${prefix} Planning Holiday ${i + 1}`, date, description: "Demo planning calendar entry", holidayType: "company" }); }));
    return NextResponse.json({ success: true, message: "Five linked demo records were loaded into each core PPC flow" });
  } catch (error) { console.error("PPC demo seed error:", error); return NextResponse.json({ success: false, message: "Unable to load demo data" }, { status: 500 }); }
}
