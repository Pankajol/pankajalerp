"use client";
import { useParams } from "next/navigation";
import RecordDetails from "@/components/textiles/RecordDetails";
export default function Page() { const { id } = useParams(); return <RecordDetails title="Textile BOM" endpoint={`/textiles/bom/${id}`} backHref="/admin/textiles/bom" />; }
