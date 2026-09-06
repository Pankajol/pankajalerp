"use client";
import { useParams } from "next/navigation";
import DocTypeForm from "@/components/textiles/DocTypeForm";
export default function NewTextileDocTypePage() { const { slug } = useParams(); return <DocTypeForm slug={slug} />; }

