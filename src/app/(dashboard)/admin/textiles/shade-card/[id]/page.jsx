// app/admin/textiles/shade-card/[id]/edit/page.jsx
"use client";

import { useParams } from "next/navigation";
import ShadeCardForm from "../_components/ShadeCardForm";

export default function EditShadeCard() {
  const { id } = useParams();
  return <ShadeCardForm id={id} />;
}
