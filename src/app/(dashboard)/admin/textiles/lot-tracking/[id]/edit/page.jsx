"use client";
import { useParams } from "next/navigation";
import LotForm from "../../_components/LotForm";
export default function EditLotTracking() {
  const { id } = useParams();
  return <LotForm id={id} />;
}