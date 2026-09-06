// app/admin/textiles/dyeing-recipes/[id]/edit/page.jsx
"use client"; // ← Fix: "use client" (not "user client")

import { useParams } from "next/navigation";
import DyeingRecipeForm from "../../_components/DyeingRecipeForm";

export default function EditDyeingRecipe() {
  const { id } = useParams();
  return <DyeingRecipeForm id={id} />;
}