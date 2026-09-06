"use client";
import { useParams } from "next/navigation";
import RecordDetails from "@/components/textiles/RecordDetails";
export default function Page() { const { id } = useParams(); return <RecordDetails title="Production Costing" endpoint={`/textiles/costing/${id}`} backHref="/admin/textiles/costing" />; }
