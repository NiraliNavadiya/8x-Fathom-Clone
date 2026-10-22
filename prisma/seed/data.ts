// Test data for the two meetings whose videos are in Neon Object Storage.
// Transcripts are in ./transcripts, copied verbatim from the provided text.
// Summaries, action items and annotations were written from those transcripts;
// every timestamp points at the start of the segment it refers to.
// Unknown values are null rather than guessed.

import type { AnnotationType } from "../../src/generated/prisma/enums";
import type { SummaryContent } from "../../src/lib/summaries";

/** "m:ss" → milliseconds. */
export const t = (time: string) => {
  const [m, s] = time.split(":").map(Number);
  return (m * 60 + s) * 1000;
};

export type SeedMeeting = {
  videoKey: string; // exact key in the `assets` bucket
  transcriptFile: string;
  format: "inline" | "block";
  title: string;
  description: string;
  recordedAt: Date | null;
  durationMs: number; // read from the MP4 `mvhd` box
  folder: string;
  tags: string[];
  speakers: { name: string; role: string | null }[];
  summaries: { [T in keyof SummaryContentMap]: SummaryContentMap[T] };
  actionItems: {
    description: string;
    assignee: string | null;
    timestampMs: number | null;
    dueDate: Date | null;
    completed: boolean;
  }[];
  annotations: { type: AnnotationType; segmentStartMs: number; quote: string; note: string | null }[];
  timeline: { title: string; startMs: number; endMs: number }[];
};

type SummaryContentMap = {
  AI_NOTES: SummaryContent<"AI_NOTES">;
  MEETING_MINUTES: SummaryContent<"MEETING_MINUTES">;
  SUMMARY: SummaryContent<"SUMMARY">;
  CUSTOMER_FEEDBACK: SummaryContent<"CUSTOMER_FEEDBACK">;
  PROJECT_MEETING: SummaryContent<"PROJECT_MEETING">;
};

const productLaunch: SeedMeeting = {
  videoKey: "Fathom Test Meeting 4 - Oct 21 2026.mp4",
  transcriptFile: "fathom-test-meeting-4.txt",
  format: "inline",
  title: "Fathom Test Meeting 4",
  description:
    "Launch planning for the new product targeted for next Friday: landing page, marketing campaign and payment integration.",
  // Date from the transcript title and file name; the time of day is unknown.
  recordedAt: new Date("2026-10-21T00:00:00Z"),
  durationMs: 134_242,
  folder: "Product",
  tags: ["Product Launch", "Planning"],
  speakers: [{ name: "Nirali", role: null }],
  summaries: {
    AI_NOTES: {
      overview:
        "Nirali ran a short meeting to finalize the plan for launching the new product next Friday, covering the landing page, the marketing campaign and the payment integration.",
      sections: [
        {
          heading: "Workstreams",
          points: [
            { text: "Landing page: Rahul to finish the design and implementation by Wednesday.", timestampMs: t("0:33") },
            {
              text: "Marketing: launch campaign with social media posts and email announcements by Thursday afternoon.",
              timestampMs: t("0:46"),
            },
            {
              text: "Payments: the integration hasn't been fully tested; Nirali owns testing the checkout flow by Wednesday evening.",
              timestampMs: t("1:00"),
            },
          ],
        },
        {
          heading: "Launch criteria",
          points: [
            {
              text: "Landing page reviewed, payment flow working and marketing material ready.",
              timestampMs: t("1:13"),
            },
            { text: "If payments aren't reliable, the launch is postponed.", timestampMs: t("1:25") },
          ],
        },
        {
          heading: "Next steps",
          points: [
            { text: "Final review meeting on Friday morning.", timestampMs: t("1:25") },
            {
              text: "Landing page shared before Thursday, campaign draft by Thursday afternoon, payment test results in Slack by Wednesday evening.",
              timestampMs: t("1:38"),
            },
            { text: "Target launch is next Friday, assuming all three items are ready.", timestampMs: t("1:52") },
          ],
        },
      ],
    },
    MEETING_MINUTES: {
      attendees: ["Nirali"],
      agenda: ["Landing page", "Marketing campaign", "Payment integration", "Launch criteria"],
      discussion: [
        {
          topic: "Landing page",
          notes: "Rahul to finish design and implementation by Wednesday, leaving time to review it.",
          timestampMs: t("0:33"),
        },
        {
          topic: "Marketing campaign",
          notes: "Launch campaign covering social media posts and email announcements, due Thursday afternoon.",
          timestampMs: t("0:46"),
        },
        {
          topic: "Payment integration",
          notes: "Identified as the biggest risk because it hasn't been fully tested. Nirali takes ownership of testing the checkout flow.",
          timestampMs: t("1:00"),
        },
        {
          topic: "Launch criteria",
          notes: "Landing page reviewed, payment flow working, marketing material ready.",
          timestampMs: t("1:13"),
        },
      ],
      decisions: [
        { text: "Launch only if all three launch criteria are met.", timestampMs: t("1:13") },
        { text: "Postpone the launch if payments aren't reliable.", timestampMs: t("1:25") },
        { text: "Hold a final review meeting on Friday morning.", timestampMs: t("1:25") },
        { text: "Target launch date is next Friday.", timestampMs: t("1:52") },
      ],
      nextSteps: [
        { text: "Rahul: share the landing page before Thursday.", timestampMs: t("1:38") },
        { text: "Priya: share the campaign draft by Thursday afternoon.", timestampMs: t("1:38") },
        { text: "Nirali: post the payment test results in Slack by Wednesday evening.", timestampMs: t("1:38") },
      ],
    },
    SUMMARY: {
      tldr: "The new product is targeted to launch next Friday if the landing page is reviewed, payments work and marketing is ready; untested payments are the main risk and would delay the launch.",
      keyPoints: [
        { text: "Launch planned for next Friday.", timestampMs: t("0:21") },
        { text: "Landing page due Wednesday; campaign due Thursday afternoon.", timestampMs: t("0:33") },
        { text: "Payment integration is the biggest risk; checkout testing due Wednesday evening.", timestampMs: t("1:00") },
        { text: "Launch is postponed if payments aren't reliable.", timestampMs: t("1:25") },
      ],
    },
    CUSTOMER_FEEDBACK: {
      context: "Internal launch-planning meeting. No customer feedback was discussed.",
      feedback: [],
      painPoints: [
        {
          text: "An untested payment integration could cause customer issues at launch.",
          timestampMs: t("1:25"),
        },
      ],
      requests: [],
    },
    PROJECT_MEETING: {
      goal: "Launch the new product next Friday.",
      // "The biggest risk is the payment integration. So it hasn't been fully tested yet."
      status: "at_risk",
      workstreams: [
        { name: "Landing page design and implementation", owner: "Rahul", due: "Wednesday", timestampMs: t("0:33") },
        {
          name: "Launch campaign (social media posts, email announcements)",
          // Called Sophia at 0:46 and Priya at 1:38.
          owner: null,
          due: "Thursday afternoon",
          timestampMs: t("0:46"),
        },
        { name: "Checkout flow testing", owner: "Nirali", due: "Wednesday evening", timestampMs: t("1:00") },
      ],
      risks: [
        {
          text: "Payment integration hasn't been fully tested.",
          mitigation: "Nirali tests the checkout flow and reports issues; the launch is postponed if payments aren't reliable.",
          timestampMs: t("1:00"),
        },
      ],
      nextMilestone: { text: "Final review meeting on Friday morning.", timestampMs: t("1:25") },
    },
  },
  actionItems: [
    {
      description: "Test the checkout flow and report any issues.",
      assignee: "Nirali",
      timestampMs: t("1:00"),
      // "by Wednesday evening": said on Wednesday 21 Oct, so which Wednesday is unclear.
      dueDate: null,
      completed: false,
    },
    {
      description: "Post the payment test results in Slack.",
      assignee: "Nirali",
      timestampMs: t("1:38"),
      dueDate: null,
      completed: false,
    },
  ],
  annotations: [
    {
      type: "HIGHLIGHT",
      segmentStartMs: t("1:25"),
      quote: "If payments aren't reliable, then we will postpone the launch rather than risk customer issue.",
      note: null,
    },
    {
      type: "NEEDS_REVIEW",
      segmentStartMs: t("0:46"),
      quote: "Sophia will prepare the launch campaign",
      note: "The campaign owner is Sophia here but Priya at 1:38. Confirm who owns the campaign draft.",
    },
  ],
  timeline: [
    { title: "Launch plan and landing page", startMs: t("0:21"), endMs: t("0:46") },
    { title: "Marketing campaign", startMs: t("0:46"), endMs: t("1:00") },
    { title: "Payment integration risk", startMs: t("1:00"), endMs: t("1:13") },
    { title: "Launch criteria and next steps", startMs: t("1:13"), endMs: 134_242 },
  ],
};

const boardSeats: SeedMeeting = {
  videoKey: "meeting_1.mp4",
  transcriptFile: "community-board-seats.txt",
  format: "block",
  title: "Community Board seats — call for feedback",
  description:
    "Community office hours on how Wikimedia Foundation community board seats are selected, including the trustee evaluation rubric, quotas, and the board's fiduciary duty.",
  recordedAt: null,
  durationMs: 3_088_917,
  folder: "Community",
  tags: ["Community", "Governance"],
  // Roles only where the transcript states them.
  speakers: [
    { name: "Andrew", role: null },
    { name: "James Heilman", role: "Board of Trustees member" }, // 1:19, voted on the rubric
    { name: "Chuck Rosloff", role: "Lawyer, Wikimedia Foundation" }, // 3:38
    { name: "Quin Gil", role: null },
    { name: "Biyanto Rebin", role: "Wikimedia Indonesia" }, // 17:09
    { name: "Christophe", role: "Former board member" }, // 28:15, "when we served, James and I"
    { name: "Gideon", role: null },
    { name: "Melissa Ganus", role: null },
  ],
  summaries: {
    AI_NOTES: {
      overview:
        "Community members questioned how the trustee evaluation rubric will be used to select community board seats. The discussion widened to whether the board should be more professional, quotas, the board's fiduciary duty to the Foundation versus the movement, and how the board communicates and trains future candidates.",
      sections: [
        {
          heading: "Trustee evaluation rubric",
          points: [
            {
              text: "Andrew asked how the rubric is used and what the threshold is; many community-elected trustees would not make the cut.",
              timestampMs: t("0:02"),
            },
            {
              text: "James voted against adopting it (9 to 1) because its use is still undefined.",
              timestampMs: t("1:19"),
            },
            { text: "Chuck: there is no preset minimum threshold in the form.", timestampMs: t("6:13") },
            {
              text: "Quin: its use depends on selection processes that aren't designed yet; it can also be a communication tool for voters.",
              timestampMs: t("6:22"),
            },
          ],
        },
        {
          heading: "Professional board and quotas",
          points: [
            {
              text: "Christophe: the rubric pushes toward a professionalized board; if that's the goal it should be said clearly.",
              timestampMs: t("9:32"),
            },
            { text: "Gideon: the rubric puts the cart before the horse; quotas feel tokenistic.", timestampMs: t("11:04") },
            {
              text: "Quin: the board's ideas are questions for discussion, not plans; feedback will go into the report.",
              timestampMs: t("14:07"),
            },
          ],
        },
        {
          heading: "Fiduciary duty",
          points: [
            { text: "James: the board's fiduciary responsibility is legally to the Foundation.", timestampMs: t("22:54") },
            {
              text: "Christophe: by design the board will make decisions not everyone in the movement is happy with.",
              timestampMs: t("23:44"),
            },
            {
              text: "Andrew: open board meetings would help the community understand this tension.",
              timestampMs: t("27:10"),
            },
          ],
        },
        {
          heading: "Communication and training",
          points: [
            { text: "Quin: there is a general communications problem with board activities.", timestampMs: t("36:20") },
            {
              text: "Gideon proposed training future board members at the yearly affiliates conference.",
              timestampMs: t("41:42"),
            },
            {
              text: "Quin: training comes up consistently and is a priority, though too late for this year's election.",
              timestampMs: t("44:22"),
            },
            { text: "Chuck: the Board Handbook is due for a refresh.", timestampMs: t("47:17") },
          ],
        },
      ],
    },
    MEETING_MINUTES: {
      attendees: [
        "Andrew",
        "James Heilman",
        "Chuck Rosloff",
        "Quin Gil",
        "Biyanto Rebin",
        "Christophe",
        "Gideon",
        "Melissa Ganus",
      ],
      agenda: [
        "Trustee evaluation rubric",
        "Professional board, quotas and diversity",
        "Fiduciary duty",
        "Board role, training and communication",
      ],
      discussion: [
        {
          topic: "Trustee evaluation rubric",
          notes: "Its use and thresholds are undefined; 4 of the 8 proposals rely on it. No preset minimum threshold exists.",
          timestampMs: t("0:02"),
        },
        {
          topic: "Professional board, quotas and diversity",
          notes: "Debate over whether the board should be professionalized and whether quotas help; the board's ideas are for discussion only.",
          timestampMs: t("9:32"),
        },
        {
          topic: "Fiduciary duty",
          notes: "Legal duty is to the Foundation; participants disagreed on whether that conflicts with serving the movement.",
          timestampMs: t("22:22"),
        },
        {
          topic: "Board role, training and communication",
          notes: "The board is strategic, not operational; workload varies; communication and candidate training need improvement.",
          timestampMs: t("33:00"),
        },
      ],
      decisions: [],
      nextSteps: [
        { text: "Feedback on quotas will be noted and presented in the call-for-feedback report.", timestampMs: t("14:28") },
        { text: "The community can weigh in on how the rubric is used.", timestampMs: t("8:52") },
      ],
    },
    SUMMARY: {
      tldr: "The community challenged the trustee evaluation rubric, whose use is still undefined, and the call surfaced a deeper tension: the board's legal duty is to the Foundation, while much of the community expects it to steward the whole movement.",
      keyPoints: [
        { text: "The rubric has no preset minimum threshold and its use is not yet defined.", timestampMs: t("6:13") },
        { text: "The board's ideas, including quotas, are questions for discussion, not plans.", timestampMs: t("14:07") },
        { text: "Fiduciary responsibility is legally to the Wikimedia Foundation.", timestampMs: t("22:54") },
        {
          text: "Participants want more transparency and training for prospective board members.",
          timestampMs: t("41:42"),
        },
      ],
    },
    CUSTOMER_FEEDBACK: {
      context: "Community feedback from a call for feedback on community board seat selection.",
      feedback: [
        {
          speaker: "Andrew",
          sentiment: "negative",
          text: "The rubric is a grid without metrics; it could intimidate potential candidates.",
          timestampMs: t("5:20"),
        },
        {
          speaker: "Christophe",
          sentiment: "mixed",
          text: "A more professional board is fine, but that goal should be stated clearly.",
          timestampMs: t("10:32"),
        },
        {
          speaker: "Gideon",
          sentiment: "negative",
          text: "Quotas feel like a token rather than a practical way to address a need.",
          timestampMs: t("11:57"),
        },
        {
          speaker: "Biyanto Rebin",
          sentiment: "positive",
          text: "Electing someone from outside the movement brought good feedback and new perspectives at Wikimedia Indonesia.",
          timestampMs: t("17:09"),
        },
        {
          speaker: "Melissa Ganus",
          sentiment: "neutral",
          text: "Asked how many hours a week board work takes.",
          timestampMs: t("34:56"),
        },
      ],
      painPoints: [
        { text: "How the rubric will be used is undefined.", timestampMs: t("1:46") },
        { text: "Lack of transparency about what the board does.", timestampMs: t("13:12") },
        { text: "The Board Handbook appears not to have been updated since 2017.", timestampMs: t("47:01") },
      ],
      requests: [
        { text: "Clarify whether the goal is a more professional board.", timestampMs: t("10:55") },
        { text: "Publish board reports and expectations regularly.", timestampMs: t("19:20") },
        { text: "Hold board meetings the community can observe.", timestampMs: t("27:10") },
        { text: "Train and develop potential board members.", timestampMs: t("41:42") },
      ],
    },
    PROJECT_MEETING: {
      goal: "Gather community feedback on how community board seats are selected.",
      status: null,
      workstreams: [
        { name: "Call-for-feedback report", owner: "Quin Gil", due: null, timestampMs: t("14:28") },
        { name: "Define how the rubric is used in selection processes", owner: null, due: null, timestampMs: t("6:22") },
        { name: "Board member training curriculum", owner: null, due: null, timestampMs: t("44:53") },
        { name: "Board Handbook refresh", owner: null, due: null, timestampMs: t("47:17") },
      ],
      risks: [
        {
          text: "An undefined rubric may discourage community candidates from standing.",
          mitigation: "Community input on how the rubric is used.",
          timestampMs: t("5:20"),
        },
        {
          text: "Training won't be ready for this year's election.",
          mitigation: null,
          timestampMs: t("44:53"),
        },
      ],
      nextMilestone: null,
    },
  },
  actionItems: [
    {
      description: "Include the feedback on quotas in the call-for-feedback report.",
      assignee: "Quin Gil",
      timestampMs: t("14:28"),
      dueDate: null,
      completed: false,
    },
    {
      // Raised as due for a refresh; nobody took it on.
      description: "Refresh the Board Handbook.",
      assignee: null,
      timestampMs: t("47:17"),
      dueDate: null,
      completed: false,
    },
  ],
  annotations: [
    {
      type: "HIGHLIGHT",
      segmentStartMs: t("6:13"),
      quote: "there is no, like, preset minimum threshold.",
      note: null,
    },
    {
      type: "NOTE",
      segmentStartMs: t("22:54"),
      quote: "our fiduciary responsibility is to the Wikimedia Foundation legally.",
      note: "Starts the Foundation-versus-movement discussion that runs to about 28:15.",
    },
  ],
  timeline: [
    { title: "Trustee evaluation rubric", startMs: t("0:02"), endMs: t("9:32") },
    { title: "Professional board, quotas and diversity", startMs: t("9:32"), endMs: t("22:22") },
    { title: "Fiduciary duty: Foundation vs. movement", startMs: t("22:22"), endMs: t("33:00") },
    { title: "Board role, training and communication", startMs: t("33:00"), endMs: 3_088_917 },
  ],
};

export const seedMeetings = [productLaunch, boardSeats];
