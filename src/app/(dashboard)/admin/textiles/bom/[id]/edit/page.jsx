"use client";
import { useParams } from "next/navigation";
import BOMForm from "../../_components/BOMForm";
export default function EditBOM() {
  const { id } = useParams();
  return <BOMForm id={id} />;
}
