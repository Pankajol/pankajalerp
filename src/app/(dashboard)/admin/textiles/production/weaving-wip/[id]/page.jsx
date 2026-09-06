"use client";
import { useParams } from "next/navigation";
import RecordDetails from "@/components/textiles/RecordDetails";
export default function Page() { const { id } = useParams(); return <RecordDetails title="Weaving WIP" endpoint={`/textiles/weaving-wip/${id}`} backHref="/admin/textiles/production/weaving-wip" />; }
