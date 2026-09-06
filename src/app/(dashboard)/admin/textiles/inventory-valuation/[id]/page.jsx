"use client";
import { useParams } from "next/navigation";
import RecordDetails from "@/components/textiles/RecordDetails";
export default function Page() { const { id } = useParams(); return <RecordDetails title="Inventory Valuation" endpoint={`/textiles/inventory-valuation/${id}`} backHref="/admin/textiles/inventory-valuation" />; }
