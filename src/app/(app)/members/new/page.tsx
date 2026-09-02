import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { createMember } from "@/lib/actions/members";
import { Header } from "@/components/header";
import { MemberForm } from "@/components/member-form";

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; firstName?: string; lastName?: string; phone?: string }>;
}) {
  const session = await requirePermission("members.create");
  const { t, locale } = await getT();
  const params = await searchParams;

  return (
    <>
      <Header title={t.members.addNew} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <MemberForm
          action={createMember}
          t={t}
          leadId={params.leadId}
          initialValues={{ firstName: params.firstName, lastName: params.lastName, phone: params.phone }}
        />
      </main>
    </>
  );
}
