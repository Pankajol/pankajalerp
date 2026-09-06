// app/admin/textiles/dyeing-recipes/[id]/view/page.jsx

"use client"; // ← Fix: "use client" (not "user client")
import { useParams } from "next/navigation";
import DyeingRecipeForm from "../../_components/DyeingRecipeForm";

export default function ViewDyeingRecipe() {
  const { id } = useParams();
  return <DyeingRecipeForm id={id} viewOnly={true} />;
}