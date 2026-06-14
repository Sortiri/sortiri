import { InviteAcceptPage } from "@/components/settings/invite-accept-page";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <InviteAcceptPage token={token} />;
}
