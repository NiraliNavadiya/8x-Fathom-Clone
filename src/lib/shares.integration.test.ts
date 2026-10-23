import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createMeeting, deleteMeeting } from "@/lib/meetings";
import {
  activateShareLink,
  addShareRecipients,
  getShareInfo,
  meetingIdForToken,
  removeShareRecipient,
  revokeShareLink,
} from "@/lib/shares";

const TEST_PREFIX = `test/${randomUUID()}/`;

afterAll(async () => {
  await db().meeting.deleteMany({ where: { videoKey: { startsWith: TEST_PREFIX } } });
  await db().$disconnect();
});

const newMeeting = () =>
  createMeeting({ title: "Share test", videoKey: `${TEST_PREFIX}${randomUUID()}.mp4`, videoContentType: "video/mp4", videoSizeBytes: 1 });

describe("share links", () => {
  it("knows the link before it exists; it works only once activated, and only its hash is stored", async () => {
    const meeting = await newMeeting();
    const info = (await getShareInfo(meeting.id))!;
    expect(info).toMatchObject({ active: false, recipients: [] });
    expect(info.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await meetingIdForToken(info.token)).toBeNull();

    const shareId = await activateShareLink(meeting.id, info.version);
    expect(shareId).toBeTruthy();
    expect(await activateShareLink(meeting.id, info.version)).toBe(shareId); // idempotent
    expect(await meetingIdForToken(info.token)).toBe(meeting.id);
    expect(await getShareInfo(meeting.id)).toMatchObject({ token: info.token, active: true });

    const rows = await db().share.findMany({ where: { meetingId: meeting.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].tokenHash).not.toContain(info.token);
  });

  it("revoking kills the link for good and hands out a different one", async () => {
    const meeting = await newMeeting();
    const { token: first, version } = (await getShareInfo(meeting.id))!;
    await activateShareLink(meeting.id, version);
    await addShareRecipients(meeting.id, version, ["ana@example.com"]);

    const next = (await revokeShareLink(meeting.id))!;
    expect(next.token).not.toBe(first);
    expect(await meetingIdForToken(first)).toBeNull();
    expect(await getShareInfo(meeting.id)).toEqual({ ...next, active: false, recipients: [] });

    // A stale version (e.g. a dialog opened before the revoke) can't revive the old link.
    expect(await activateShareLink(meeting.id, version)).toBeNull();
    expect(await addShareRecipients(meeting.id, version, ["ben@example.com"])).toBeNull();
    expect(await meetingIdForToken(first)).toBeNull();

    await activateShareLink(meeting.id, next.version);
    expect(await meetingIdForToken(next.token)).toBe(meeting.id);
  });

  it("retires links created before signing when the signed link is activated", async () => {
    const meeting = await newMeeting();
    await db().share.create({ data: { meetingId: meeting.id, scope: "MEETING", access: "PUBLIC", tokenHash: randomUUID() } });
    await activateShareLink(meeting.id, 0);
    expect(await db().share.count({ where: { meetingId: meeting.id, revokedAt: null } })).toBe(1);
  });

  it("rejects unknown, malformed and deleted-meeting links", async () => {
    const meeting = await newMeeting();
    const { token } = (await getShareInfo(meeting.id))!;
    await activateShareLink(meeting.id, 0);
    expect(await meetingIdForToken("x".repeat(43))).toBeNull();
    expect(await meetingIdForToken("../../etc")).toBeNull();
    await deleteMeeting(meeting.id);
    expect(await meetingIdForToken(token)).toBeNull();
    expect(await activateShareLink(meeting.id, 0)).toBeNull();
    expect(await revokeShareLink(meeting.id)).toBeNull();
    expect(await getShareInfo(meeting.id)).toBeNull();
  });

  it("adds people in one step, normalised and de-duplicated, and removes them", async () => {
    const meeting = await newMeeting();
    expect(await addShareRecipients(meeting.id, 0, ["Ana@Example.com", "ana@example.com", "ben@example.com"])).toEqual([
      "ana@example.com",
      "ben@example.com",
    ]);
    const info = (await getShareInfo(meeting.id))!;
    expect(info).toMatchObject({ active: true, recipients: ["ana@example.com", "ben@example.com"] });
    expect(await meetingIdForToken(info.token)).toBe(meeting.id); // adding people activates the link

    await addShareRecipients(meeting.id, 0, ["ben@example.com", "cy@example.com"]);
    expect(await removeShareRecipient(meeting.id, "BEN@example.com")).toBe(true);
    expect((await getShareInfo(meeting.id))?.recipients).toEqual(["ana@example.com", "cy@example.com"]);
    await expect(addShareRecipients(meeting.id, 0, ["not-an-email"])).rejects.toThrow();
    await expect(addShareRecipients(meeting.id, 0, [])).rejects.toThrow();
  });
});
