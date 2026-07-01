import { notFound } from "next/navigation";
import { ChatWidget } from "@/components/ChatWidget";
import { getPublicBusiness } from "@/lib/db";
import { createAnonRouteClient } from "@/lib/supabase/route";

export default async function PublicBusinessChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await getPublicBusiness(createAnonRouteClient(), slug);

  if (!business) {
    notFound();
  }

  return <ChatWidget business={business} />;
}
