"use client";

import { useParams } from "next/navigation";
import TakaForm from "@/components/textiles/TakaForm";

export default function EditTaka() {
  const { id } = useParams();
  if (!id) return <div className="p-6 text-center">Loading...</div>;
  return <TakaForm key={id} id={id} />;
}
