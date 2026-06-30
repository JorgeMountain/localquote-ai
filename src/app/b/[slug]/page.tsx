import { notFound } from "next/navigation";
import { ChatWidget } from "@/components/ChatWidget";
import { getBusinessBySlug } from "@/lib/store";

export default async function PublicBusinessChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = getBusinessBySlug(slug);

  if (!business) {
    notFound();
  }

  return <ChatWidget business={business} />;
}
