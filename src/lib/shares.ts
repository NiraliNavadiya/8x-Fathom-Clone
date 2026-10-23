import "server-only";

import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { shareEnv } from "@/lib/env";

// Share links for a whole meeting. Anyone holding an active link can view the
// meeting read-only; there is no sign-in, so the recipient list records who
// it was shared with but does not restrict access.
//
// A link's token is an HMAC of the meeting id and its share version, so the
// server can show the link at any time without storing it: the database keeps
// only a SHA-256 hash of the token. Revoking bumps the version, which retires
// the old link for good. Changing SHARE_LINK_SECRET breaks every link.

export type ShareInfo = {
  token: string;
  /** The meeting's share version the token was made for; actions send it back. */
  version: number;
  /** False until the link is first copied or shared; it doesn't work before then. */
  active: boolean;
  recipients: string[];
};

const uuid = z.uuid();
export const emailsSchema = z
  .array(z.email("Enter valid email addresses").transform((e) => e.trim().toLowerCase()))
  .min(1, "Enter at least one email address")
  .max(50, "Add at most 50 people at a time");

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function linkToken(meetingId: string, shareVersion: number) {
  return createHmac("sha256", shareEnv().SHARE_LINK_SECRET).update(`${meetingId}:${shareVersion}`).digest("base64url");
}

const live = { revokedAt: null, scope: "MEETING" as const };

/** The meeting's current link and who it was shared with, in one query. */
export async function getShareInfo(meetingId: string): Promise<ShareInfo | null> {
  if (!uuid.safeParse(meetingId).success) return null;
  const meeting = await db().meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    select: {
      shareVersion: true,
      shares: { where: live, select: { tokenHash: true, recipients: { select: { email: true }, orderBy: { email: "asc" } } } },
    },
  });
  if (!meeting) return null;
  const token = linkToken(meetingId, meeting.shareVersion);
  const share = meeting.shares.find((s) => s.tokenHash === hashToken(token));
  return {
    token,
    version: meeting.shareVersion,
    active: Boolean(share),
    recipients: share?.recipients.map((r) => r.email) ?? [],
  };
}

/**
 * Makes the link for `version` work and records any `emails`, in one round
 * trip. The server derives the token itself, and nothing happens unless
 * `version` is still the meeting's current one, so a stale or forged version
 * can't revive a revoked link. Other live links for the meeting (e.g. from
 * before links were signed) are revoked. Returns the share id, or null when
 * the meeting is gone or the link was revoked meanwhile.
 */
async function upsertShare(meetingId: string, version: number, emails: string[]): Promise<string | null> {
  if (!uuid.safeParse(meetingId).success || !Number.isInteger(version)) return null;
  const tokenHash = hashToken(linkToken(meetingId, version));
  const rows = await db().$queryRaw<{ id: string }[]>`
    WITH m AS (
      SELECT id FROM meetings WHERE id = ${meetingId}::uuid AND NOT is_deleted AND share_version = ${version}
    ),
    s AS (
      INSERT INTO shares (id, meeting_id, scope, access, token_hash)
      SELECT gen_random_uuid(), m.id, 'MEETING', 'PUBLIC', ${tokenHash} FROM m
      ON CONFLICT (token_hash) DO UPDATE SET token_hash = EXCLUDED.token_hash
      RETURNING id, revoked_at
    ),
    old AS (
      UPDATE shares SET revoked_at = now()
      WHERE meeting_id = (SELECT id FROM m) AND scope = 'MEETING' AND revoked_at IS NULL AND token_hash <> ${tokenHash}
    ),
    r AS (
      INSERT INTO share_recipients (id, share_id, email)
      SELECT gen_random_uuid(), s.id, e FROM s, unnest(${emails}::text[]) AS e WHERE s.revoked_at IS NULL
      ON CONFLICT (share_id, email) DO NOTHING
    )
    SELECT id::text FROM s WHERE revoked_at IS NULL`;
  return rows[0]?.id ?? null;
}

export function activateShareLink(meetingId: string, version: number): Promise<string | null> {
  return upsertShare(meetingId, version, []);
}

/** Records people the meeting was shared with (activating the link). Returns the stored emails. */
export async function addShareRecipients(meetingId: string, version: number, emails: string[]): Promise<string[] | null> {
  const clean = [...new Set(emailsSchema.parse(emails))];
  return (await upsertShare(meetingId, version, clean)) ? clean : null;
}

/** Retires the current link and returns the next one (not yet active), in one round trip. */
export async function revokeShareLink(meetingId: string): Promise<{ token: string; version: number } | null> {
  if (!uuid.safeParse(meetingId).success) return null;
  const rows = await db().$queryRaw<{ share_version: number }[]>`
    WITH revoked AS (
      UPDATE shares SET revoked_at = now()
      WHERE meeting_id = ${meetingId}::uuid AND scope = 'MEETING' AND revoked_at IS NULL
    )
    UPDATE meetings SET share_version = share_version + 1
    WHERE id = ${meetingId}::uuid AND NOT is_deleted
    RETURNING share_version`;
  const version = rows[0]?.share_version;
  return version === undefined ? null : { token: linkToken(meetingId, version), version };
}

export async function removeShareRecipient(meetingId: string, email: string): Promise<boolean> {
  if (!uuid.safeParse(meetingId).success) return false;
  const { count } = await db().shareRecipient.deleteMany({
    where: { email: email.trim().toLowerCase(), share: { meetingId, ...live } },
  });
  return count > 0;
}

/** The meeting an active, unexpired link points to, or null. */
export async function meetingIdForToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const share = await db().share.findFirst({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      meeting: { isDeleted: false },
    },
    select: { meetingId: true },
  });
  return share?.meetingId ?? null;
}
