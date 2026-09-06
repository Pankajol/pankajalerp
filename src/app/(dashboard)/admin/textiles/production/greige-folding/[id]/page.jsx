"use client";
import { useParams } from "next/navigation";
import RecordDetails from "@/components/textiles/RecordDetails";
export default function Page() { const { id } = useParams(); return <RecordDetails title="Greige Folding" endpoint={`/textiles/greige-folding/${id}`} backHref="/admin/textiles/production/greige-folding" />; }
