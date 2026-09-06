
"use client";
import { useParams } from "next/navigation";
import QualityParameterForm from "../../_components/QualityParameterForm";
export default function EditQualityParameters() {
  const { id } = useParams();
  return <QualityParameterForm id={id} />;
}
