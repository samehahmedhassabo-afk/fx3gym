import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateMember } from "@/lib/actions/members";
import { Header } from "@/components/header";
import { MemberForm } from "@/components/member-form";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("members.edit");
  const { t, locale } = await getT();
  const { id } = await params;
  const member = await db.member.findUnique({ where: { id }, include: { referredByMember: { select: { phone: true } } } });
  if (!member) notFound();

  const action = updateMember.bind(null, id);

  return (
    <>
      <Header title={t.common.edit} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <MemberForm action={action} member={member} t={t} referredByPhone={member.referredByMember?.phone} />
      </main>
    </>
  );
}
