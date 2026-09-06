"use client";
import { useParams } from "next/navigation";
import RecordDetails from "@/components/textiles/RecordDetails";
export default function Page() { const { id } = useParams(); return <RecordDetails title="Sales Order Production" endpoint={`/textiles/sales-order-production/${id}`} backHref="/admin/textiles/sales-order-integration" />; }
