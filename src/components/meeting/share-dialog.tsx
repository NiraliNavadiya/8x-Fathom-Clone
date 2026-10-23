"use client";

import { Check, Copy, Globe, Link2Off, Mail, Share2, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  activateShareLinkAction,
  addShareRecipientsAction,
  removeShareRecipientAction,
  revokeShareLinkAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ShareInfo } from "@/lib/shares";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ShareButton({
  meetingId,
  title,
  initial,
}: {
  meetingId: string;
  title: string;
  initial: ShareInfo | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="default"
        onClick={() => setOpen(true)}
        className="ml-auto text-md h-10"
      >
        <Share2 aria-hidden />
        Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-6 px-6 py-6 sm:max-w-lg sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Share “{title}”
            </DialogTitle>
          </DialogHeader>

          {initial ? (
            <ShareSettings
              meetingId={meetingId}
              title={title}
              initial={initial}
            />
          ) : (
            <p role="alert" className="text-sm text-destructive">
              Sharing isn’t available right now. Reload the page and try again.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShareSettings({
  meetingId,
  title,
  initial,
}: {
  meetingId: string;
  title: string;
  initial: ShareInfo;
}) {
  const [token, setToken] = useState(initial.token);
  const [version, setVersion] = useState(initial.version);
  const [active, setActive] = useState(initial.active);
  const [recipients, setRecipients] = useState(initial.recipients);
  const [pendingEmails, setPendingEmails] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [emails, setEmails] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${token}`
      : "";

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function activate() {
    if (active) return true;

    setActive(true);
    const result = await activateShareLinkAction(meetingId, version);

    if (!result.ok) setActive(false);

    return result.ok ? true : result.error;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      return toast.error(
        "Couldn't copy. Your browser blocked clipboard access.",
      );
    }

    const ok = await activate();

    if (ok !== true) {
      toast.error(`The link was copied but isn't active yet: ${ok}`);
    }
  }

  async function revoke() {
    setRevoking(true);

    const result = await revokeShareLinkAction(meetingId);

    setRevoking(false);
    setConfirmRevoke(false);

    if (!result.ok) return toast.error(result.error);

    setToken(result.data.token);
    setVersion(result.data.version);
    setActive(false);
    setRecipients([]);

    toast.success("Access revoked. The old link no longer works.");
  }

  async function addPeople(e: React.FormEvent) {
    e.preventDefault();

    const list = [
      ...new Set(
        emails
          .split(/[\s,;]+/)
          .filter(Boolean)
          .map((x) => x.toLowerCase()),
      ),
    ];

    const invalid = list.filter((x) => !EMAIL.test(x));

    if (invalid.length) {
      return setEmailError(`Not a valid email: ${invalid.join(", ")}`);
    }

    const fresh = list.filter((x) => !recipients.includes(x));

    setEmails("");
    setEmailError(null);

    if (fresh.length === 0) return;

    setRecipients((prev) => [...prev, ...fresh].sort());
    setPendingEmails((prev) => new Set([...prev, ...fresh]));

    const result = await addShareRecipientsAction(meetingId, version, fresh);

    setPendingEmails((prev) => {
      const next = new Set(prev);
      fresh.forEach((email) => next.delete(email));
      return next;
    });

    if (!result.ok) {
      setRecipients((prev) => prev.filter((x) => !fresh.includes(x)));
      setEmails(fresh.join(", "));
      setEmailError(result.error);
      return;
    }

    setActive(true);
  }

  async function removePerson(email: string) {
    setRecipients((prev) => prev.filter((x) => x !== email));

    const result = await removeShareRecipientAction(meetingId, email);

    if (!result.ok) {
      setRecipients((prev) => [...prev, email].sort());
      toast.error(result.error);
    }
  }

  const gmailHref = recipients.length
    ? `https://mail.google.com/mail/?${new URLSearchParams({
        view: "cm",
        fs: "1",
        to: recipients.join(","),
        su: `Meeting shared with you: ${title}`,
        body: `I've shared a meeting with you on Meetly.\n\n${title}\n${link}\n`,
      })}`
    : null;

  return (
    <div className="grid gap-5">
      <section aria-labelledby="share-public" className="grid gap-3">
        <h3
          id="share-public"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <Globe className="size-4 text-muted-foreground" aria-hidden />
          Share publicly
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={copyLink}
            className="h-10 min-w-32 px-4 text-sm"
            aria-live="polite"
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Copied" : "Copy link"}
          </Button>

          {active &&
            (confirmRevoke ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Revoke for everyone?
                </span>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={revoke}
                  disabled={revoking}
                >
                  {revoking ? "Revoking…" : "Revoke"}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmRevoke(false)}
                  disabled={revoking}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmRevoke(true)}
              >
                <Link2Off aria-hidden />
                Revoke access
              </Button>
            ))}
        </div>
      </section>

      <section
        aria-labelledby="share-people"
        className="grid gap-3 border-t pt-5"
      >
        <h3
          id="share-people"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <UserPlus className="size-4 text-muted-foreground" aria-hidden />
          Share with specific people
        </h3>

        <form onSubmit={addPeople} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Input
              className="h-10 text-sm"
              value={emails}
              onChange={(e) => {
                setEmails(e.target.value);
                setEmailError(null);
              }}
              placeholder="name@example.com"
              aria-label="Email addresses"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "share-people-error" : undefined}
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            className="h-10 px-5 text-sm"
            disabled={!emails.trim()}
          >
            Add
          </Button>
        </form>

        {emailError && (
          <p
            id="share-people-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {emailError}
          </p>
        )}

        {recipients.length > 0 && (
          <div className="grid gap-3">
            <ul className="flex flex-wrap gap-2" aria-label="Shared with">
              {recipients.map((email) => (
                <li
                  key={email}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border bg-background py-1 pl-3 pr-1 text-sm transition-opacity duration-150",
                    pendingEmails.has(email) && "opacity-60",
                  )}
                >
                  <span className="break-all">{email}</span>

                  <button
                    type="button"
                    onClick={() => removePerson(email)}
                    disabled={pendingEmails.has(email)}
                    aria-label={`Remove ${email}`}
                    className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>

            {gmailHref && (
              <a
                href={gmailHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Mail className="size-4" aria-hidden />
                Send the link in Gmail
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
