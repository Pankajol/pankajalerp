"use client";
import { useParams } from "next/navigation";
import DocTypeForm from "@/components/textiles/DocTypeForm";
export default function ViewTextileDocTypePage() { const { slug, id } = useParams(); return <DocTypeForm slug={slug} id={id} viewOnly />; }

