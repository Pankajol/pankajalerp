"use client";
import { useParams } from "next/navigation";
import RecordDetails from "@/components/textiles/RecordDetails";
export default function Page() { const { id } = useParams(); return <RecordDetails title="Supplier Performance" endpoint={`/textiles/supplier-performance/${id}`} backHref="/admin/textiles/supplier-performance" />; }
