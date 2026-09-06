"use client";

import { useParams } from "next/navigation";
import DesignForm from "../../_components/DesignForm";

export default function EditDesignPage() {
  const { id } = useParams();
  return <DesignForm id={id} />;
}
