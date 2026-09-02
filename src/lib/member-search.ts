import type { Prisma } from "@prisma/client";

/**
 * Splits a search query into whitespace-separated tokens. Each token must match
 * somewhere (AND across tokens, OR across fields) so "Ahmed Mohamed Aly" matches
 * regardless of how the name is split across firstName/lastName, instead of the
 * old single `contains` check on the whole typed string against one field.
 */
function tokens(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean);
}

/** Builds an AND-of-per-token-OR filter against direct Member fields. */
export function memberSearchWhere(query: string, extraFields: (keyof Prisma.MemberWhereInput)[] = []): Prisma.MemberWhereInput | undefined {
  const parts = tokens(query);
  if (parts.length === 0) return undefined;
  return {
    AND: parts.map((token) => ({
      OR: [
        { firstName: { contains: token } },
        { lastName: { contains: token } },
        { phone: { contains: token } },
        { memberCode: { contains: token } },
        ...extraFields.map((field) => ({ [field]: { contains: token } }) as Prisma.MemberWhereInput),
      ],
    })),
  };
}

/** Same as memberSearchWhere but scoped through a `member` relation, e.g. Subscription.member. */
export function memberRelationSearchWhere(query: string): Prisma.SubscriptionWhereInput | undefined {
  const parts = tokens(query);
  if (parts.length === 0) return undefined;
  return {
    AND: parts.map((token) => ({
      OR: [
        { member: { firstName: { contains: token } } },
        { member: { lastName: { contains: token } } },
        { member: { phone: { contains: token } } },
        { member: { memberCode: { contains: token } } },
      ],
    })),
  };
}
