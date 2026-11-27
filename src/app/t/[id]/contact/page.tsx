import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTagPublicRpc } from "@/lib/supabase/public";
import { readPublicTag } from "@/lib/tags/public";
import { startContact } from "./actions";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "持ち主に知らせる",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ContactPage({ params }: PageProps<"/t/[id]/contact">) {
  return (
    <main>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <Contact params={params} />
      </Suspense>
    </main>
  );
}

async function Contact({ params }: { params: PageProps<"/t/[id]/contact">["params"] }) {
  const { id } = await params;
  const tag = await readPublicTag(id, getTagPublicRpc);
  if (tag.status === "not_found") notFound();
  if (tag.status !== "active") {
    return (
      <>
        <h1>今は連絡できません</h1>
        <p>
          <Link href={`/t/${id}`}>タグのページに戻る</Link>
        </p>
      </>
    );
  }
  return (
    <>
      <p className="eyebrow">{tag.itemName}</p>
      <h1>持ち主に知らせる</h1>
      <ContactForm action={startContact.bind(null, id)} />
    </>
  );
}
