"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { DuplicateNameWarning } from "@/components/duplicate-name-warning";
import { DuplicatePhoneWarning } from "@/components/duplicate-phone-warning";
import { PhotoUploadCrop } from "@/components/photo-upload-crop";
import type { Dictionary } from "@/lib/i18n";
import type { Member } from "@prisma/client";

const REFERRAL_SOURCES = ["فيسبوك", "انستجرام", "تيك توك", "صديق / توصية", "إعلان", "مرّ بالنادي", "أخرى"];

export function MemberForm({
  action,
  member,
  t,
  referredByPhone,
  initialValues,
  leadId,
}: {
  action: (formData: FormData) => void;
  member?: Member;
  t: Dictionary;
  referredByPhone?: string | null;
  initialValues?: { firstName?: string; lastName?: string; phone?: string };
  leadId?: string;
}) {
  const dateOfBirth = member?.dateOfBirth ? member.dateOfBirth.toISOString().slice(0, 10) : "";
  const joinedAt = member?.joinedAt ? member.joinedAt.toISOString().slice(0, 10) : "";
  const [firstName, setFirstName] = useState(member?.firstName ?? initialValues?.firstName ?? "");
  const [lastName, setLastName] = useState(member?.lastName ?? initialValues?.lastName ?? "");
  const [phone, setPhone] = useState(member?.phone ?? initialValues?.phone ?? "");

  return (
    <form action={action}>
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <Card>
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="font-semibold">{member ? t.common.edit : t.members.addNew}</h2>
        </div>
        <div className="p-5 border-b border-[var(--border)]">
          <PhotoUploadCrop initialUrl={member?.photoUrl} />
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <DuplicateNameWarning firstName={firstName} lastName={lastName} excludeId={member?.id} />
          <DuplicatePhoneWarning phone={phone} excludeId={member?.id} />
          <div>
            <Label>{t.members.firstName} *</Label>
            <Input name="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>{t.members.lastName} *</Label>
            <Input name="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <Label>{t.members.phone} *</Label>
            <Input name="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>{t.members.email}</Label>
            <Input name="email" type="email" defaultValue={member?.email ?? ""} />
          </div>
          <div>
            <Label>{t.members.gender} *</Label>
            <Select name="gender" required defaultValue={member?.gender ?? "MALE"}>
              <option value="MALE">{t.members.male}</option>
              <option value="FEMALE">{t.members.female}</option>
            </Select>
          </div>
          <div>
            <Label>{t.members.dateOfBirth}</Label>
            <Input name="dateOfBirth" type="date" defaultValue={dateOfBirth} />
          </div>
          <div>
            <Label>{t.members.joinDate}</Label>
            <Input name="joinedAt" type="date" defaultValue={joinedAt} />
          </div>
          <div>
            <Label>{t.members.nationalId}</Label>
            <Input name="nationalId" defaultValue={member?.nationalId ?? ""} />
          </div>
          <div>
            <Label>{t.members.address}</Label>
            <Input name="address" defaultValue={member?.address ?? ""} />
          </div>
          <div>
            <Label>{t.members.emergencyName}</Label>
            <Input name="emergencyName" defaultValue={member?.emergencyName ?? ""} />
          </div>
          <div>
            <Label>{t.members.emergencyPhone}</Label>
            <Input name="emergencyPhone" defaultValue={member?.emergencyPhone ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label>{t.members.medicalNotes}</Label>
            <Textarea name="medicalNotes" rows={2} defaultValue={member?.medicalNotes ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label>{t.members.goals}</Label>
            <Textarea name="goals" rows={2} defaultValue={member?.goals ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label>{t.members.comments}</Label>
            <Textarea name="comments" rows={2} defaultValue={member?.comments ?? ""} />
            <p className="text-xs text-[var(--muted)] mt-1">{t.members.commentsHint}</p>
          </div>
          <div>
            <Label>وصلتلنا إزاي؟</Label>
            <Select name="referralSource" defaultValue={member?.referralSource ?? ""}>
              <option value="">— اختر —</option>
              {REFERRAL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>رقم هاتف العضو الذي رشّحه (اختياري)</Label>
            <Input name="referredByPhone" defaultValue={referredByPhone ?? ""} placeholder="لو العضو مرشّح من عضو تاني" />
            <p className="text-xs text-[var(--muted)] mt-1">لو العضو ده رشّح شخص جديد، هيتحسبله نقاط ولاء عند أول دفعة.</p>
          </div>
        </div>
        <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
          <Link href={member ? `/members/${member.id}` : "/members"}>
            <Button variant="outline" type="button">
              {t.common.cancel}
            </Button>
          </Link>
          <Button type="submit">{t.common.save}</Button>
        </div>
      </Card>
    </form>
  );
}
