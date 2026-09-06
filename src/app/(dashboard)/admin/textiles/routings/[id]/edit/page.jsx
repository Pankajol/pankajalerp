"use client";

import { useParams } from "next/navigation";
import RoutingForm from "../../_components/RoutingForm";
export default function EditRouting() {
  const { id } = useParams();
  return <RoutingForm id={id} />;
}
