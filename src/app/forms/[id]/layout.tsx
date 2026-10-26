import type { Metadata } from "next";
import { getPublicFormMetadata } from "@/lib/form-metadata";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { id } = await params;
  const form = await getPublicFormMetadata(id);

  if (!form) {
    return {
      title: "Form not found",
      description: "This form is no longer available.",
    };
  }

  const title = form.title;

  return {
    title,
    description:
      form.description?.trim() ||
      `Complete ${title} using cgwork.`,
    openGraph: {
      title: `${title} | cgwork`,
      description:
        form.description?.trim() ||
        `Complete ${title} using cgwork.`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | cgwork`,
      description:
        form.description?.trim() ||
        `Complete ${title} using cgwork.`,
    },
  };
}

export default function FormLayout({ children }: Props) {
  return children;
}