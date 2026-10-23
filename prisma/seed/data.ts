// Test data for the meetings whose videos are in Neon Object Storage.
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
  title: "",
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

const EDITOR_ROUNDTABLE_MS = 1_017_375;

// Speakers are diarization labels ("Speaker A"...). The transcript's own names
// for them conflict (A is called both Betsy and Mariana), so labels are kept.
const editorRoundtable: SeedMeeting = {
  videoKey: "Editor engagement roundtable.mp4",
  transcriptFile: "editor-engagement-roundtable.txt",
  format: "block",
  title: "Editor engagement roundtable",
  description:
    "Workshop with experienced editors collecting talk-page and communication workflows: welcome messages, collaboration, patrolling, acknowledgments and mass messaging.",
  recordedAt: null,
  durationMs: EDITOR_ROUNDTABLE_MS,
  folder: "Community",
  tags: ["Community", "User Research"],
  speakers: [
    { name: "Speaker A", role: null },
    { name: "Speaker B", role: null },
    { name: "Speaker C", role: null },
    { name: "Speaker D", role: null },
    { name: "Speaker E", role: null },
    { name: "Speaker F", role: null },
    { name: "Speaker G", role: null },
    { name: "Jake", role: null },
  ],
  summaries: {
    AI_NOTES: {
      overview:
        "Experienced editors shared how they use talk pages and messages before breaking into small groups to map one workflow each. The discussion covered welcome messages, collaboration, patrolling and watchlists, acknowledgments, mass messaging and the New Pages feed.",
      sections: [
        {
          heading: "Welcome messages",
          points: [
            {
              text: "Speaker C was welcomed early on but couldn't tell whether it came from a person or a bot; it felt devoid of social cues.",
              timestampMs: t("0:25"),
            },
            { text: "Speaker C: just saying whether a message is automated would help.", timestampMs: t("1:07") },
            { text: "In user tests, people split 50/50 on whether the welcome came from a human or a robot.", timestampMs: t("1:18") },
            {
              text: "Speaker E suggested welcoming automatically, clearly marked as automated, with starting points based on the user's interests.",
              timestampMs: t("1:27"),
            },
          ],
        },
        {
          heading: "Connection and collaboration",
          points: [
            {
              text: "Speaker A's first edit was translated overnight, and a personal welcome from another editor started a real conversation.",
              timestampMs: t("2:18"),
            },
            {
              text: "Speaker A rounded up editors in several countries to improve a Japanese editor's math article within 24 hours.",
              timestampMs: t("4:24"),
            },
            {
              text: "A human connection matters more than boilerplate text and tutorials.",
              timestampMs: t("5:30"),
            },
          ],
        },
        {
          heading: "Simple automated welcomes",
          points: [
            {
              text: "Speaker G's project uses a welcome bot that signs messages as someone active in the past hour.",
              timestampMs: t("6:02"),
            },
            { text: "Hand-made templates with many links had become overwhelming.", timestampMs: t("6:40") },
            {
              text: "Keep it simple: a greeting, something to try and an offer to help. Newcomers often write back.",
              timestampMs: t("7:24"),
            },
          ],
        },
        {
          heading: "Patrolling, acknowledgments and messaging",
          points: [
            {
              text: "Speaker D reverts vandalism and leaves templated warnings, but only wants to hear back about thoughtful replies.",
              timestampMs: t("8:23"),
            },
            {
              text: "Speaker D watches other users' talk pages to find articles to help with, without interacting.",
              timestampMs: t("10:32"),
            },
            {
              text: "Workflows should include what happens before and after the talk-page step; a one-click revert-and-warn is really several events.",
              timestampMs: t("11:22"),
            },
            {
              text: "Jake wants easier ways to thank people and to collect acknowledgments like Barnstars, and a replacement for EdwardsBot.",
              timestampMs: t("13:00"),
            },
            { text: "Speaker F finds the New Pages feed useful for finding and improving new articles.", timestampMs: t("14:58") },
          ],
        },
      ],
    },
    MEETING_MINUTES: {
      attendees: ["Speaker A", "Speaker B", "Speaker C", "Speaker D", "Speaker E", "Speaker F", "Speaker G", "Jake"],
      agenda: [
        "Welcome messages",
        "Connection and collaboration stories",
        "Patrolling and watchlists",
        "Acknowledgments and mass messaging",
        "Small-group workflow breakdowns",
      ],
      discussion: [
        {
          topic: "Welcome messages",
          notes: "Newcomers can't tell automated welcomes from personal ones. Proposals: label automated messages, or keep them simple and signed by someone currently active.",
          timestampMs: t("0:25"),
        },
        {
          topic: "Connection and collaboration stories",
          notes: "Personal contact and rounding up collaborators across countries drew editors in more than the content itself.",
          timestampMs: t("2:18"),
        },
        {
          topic: "Patrolling and watchlists",
          notes: "Patrollers want notice of replies to their warnings without watchlisting every user. Some work starts from other users' talk pages.",
          timestampMs: t("8:23"),
        },
        {
          topic: "Acknowledgments and mass messaging",
          notes: "Requests for easier thanks, collecting acknowledgments, and replacing the EdwardsBot global messaging bot.",
          timestampMs: t("13:00"),
        },
      ],
      decisions: [
        { text: "Hold the reply-notification question until later.", timestampMs: t("10:27") },
        { text: "Break into small groups, each picking one workflow.", timestampMs: t("16:05") },
      ],
      nextSteps: [
        { text: "Read back the workflows discussed so far.", timestampMs: t("16:05") },
        { text: "Small groups each work through one workflow.", timestampMs: t("16:05") },
      ],
    },
    SUMMARY: {
      tldr: "Editors want welcomes that feel human or are honestly labeled as automated, notifications only for replies they care about, easier ways to thank each other, and a better mass-messaging tool than EdwardsBot.",
      keyPoints: [
        { text: "Users split 50/50 on whether a welcome came from a human or a bot.", timestampMs: t("1:18") },
        { text: "Simple welcomes signed by someone currently active get replies.", timestampMs: t("7:24") },
        { text: "Patrollers want to hear only about thoughtful replies to their warnings.", timestampMs: t("9:34") },
        { text: "Requests for easier acknowledgments and a replacement for EdwardsBot.", timestampMs: t("13:28") },
      ],
    },
    CUSTOMER_FEEDBACK: {
      context: "Feedback from experienced editors on talk-page and communication workflows, gathered in a workshop.",
      feedback: [
        {
          speaker: "Speaker C",
          sentiment: "negative",
          text: "Being welcomed without knowing whether it was a person or a bot felt devoid of social cues.",
          timestampMs: t("0:47"),
        },
        {
          speaker: "Speaker A",
          sentiment: "positive",
          text: "A personal welcome from another editor was what got them into the community.",
          timestampMs: t("2:46"),
        },
        {
          speaker: "Speaker G",
          sentiment: "positive",
          text: "Simple automated welcomes still open a conversation; newcomers often reply.",
          timestampMs: t("7:03"),
        },
        {
          speaker: "Speaker D",
          sentiment: "negative",
          text: "Watchlisting every warned user's talk page would flood the watchlist.",
          timestampMs: t("9:54"),
        },
        {
          speaker: "Jake",
          sentiment: "negative",
          text: "EdwardsBot is a low-tech, difficult way to message many users.",
          timestampMs: t("14:37"),
        },
        {
          speaker: "Speaker F",
          sentiment: "positive",
          text: "The New Pages feed is helpful for finding new articles to improve.",
          timestampMs: t("14:58"),
        },
      ],
      painPoints: [
        { text: "Newcomers can't tell whether a welcome is automated.", timestampMs: t("1:07") },
        { text: "Template-heavy welcomes with many links are overwhelming.", timestampMs: t("6:40") },
        { text: "No way to be notified only when a warned user replies.", timestampMs: t("9:34") },
        { text: "Sending a message to many users is difficult.", timestampMs: t("14:37") },
      ],
      requests: [
        { text: "Indicate whether a message is automated or from a person.", timestampMs: t("1:07") },
        { text: "Notify only on replies, not on other templates or blocks.", timestampMs: t("9:34") },
        { text: "Collect acknowledgments, such as a thanks counter.", timestampMs: t("13:28") },
        { text: "A thanks button on Barnstars.", timestampMs: t("13:54") },
        { text: "Replace EdwardsBot.", timestampMs: t("14:15") },
      ],
    },
    PROJECT_MEETING: {
      goal: "Collect editor talk-page workflows and pick one per small group to map in detail.",
      status: null,
      workstreams: [
        { name: "Small-group workflow breakdowns", owner: null, due: null, timestampMs: t("16:05") },
        { name: "EdwardsBot replacement", owner: "Speaker E", due: null, timestampMs: t("14:28") },
        { name: "Reply notifications for warning messages", owner: null, due: null, timestampMs: t("10:15") },
      ],
      risks: [
        {
          text: "Users can't tell automated welcomes from personal ones.",
          mitigation: "Keep welcomes simple and signed by someone currently active.",
          timestampMs: t("1:18"),
        },
      ],
      nextMilestone: { text: "Break into small groups, each taking one workflow.", timestampMs: t("16:05") },
    },
  },
  actionItems: [
    {
      description: "Replace EdwardsBot, the global messaging bot.",
      assignee: "Speaker E", // 14:28, "I'm working on it."
      timestampMs: t("14:28"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Revisit reply notifications for warning messages.",
      assignee: null,
      timestampMs: t("10:27"),
      dueDate: null,
      completed: false,
    },
    {
      // Asked of "Mariana", who isn't one of the labeled speakers.
      description: "Read back the workflows discussed so far.",
      assignee: null,
      timestampMs: t("16:05"),
      dueDate: null,
      completed: false,
    },
    {
      description: "In small groups, pick one workflow and map it step by step.",
      assignee: null,
      timestampMs: t("16:05"),
      dueDate: null,
      completed: false,
    },
  ],
  annotations: [
    {
      type: "HIGHLIGHT",
      segmentStartMs: t("1:18"),
      quote: "we ask them do they think that the welcome message was left by a human or a robot, and it's 50/50.",
      note: null,
    },
    {
      type: "NOTE",
      segmentStartMs: t("7:24"),
      quote: "Just keep it simple, like a simple greeting.",
      note: "The main recommendation for welcome messages.",
    },
    {
      type: "NEEDS_REVIEW",
      segmentStartMs: t("6:02"),
      quote: "Wikidata has also done a lot of experimentation with welcome messages",
      note: "At 6:40 the same speaker says wikiHow. The project name may be mistranscribed.",
    },
  ],
  timeline: [
    { title: "Welcome messages: human or bot?", startMs: t("0:03"), endMs: t("1:51") },
    { title: "Stories of connection and collaboration", startMs: t("1:51"), endMs: t("6:02") },
    { title: "Simple automated welcomes", startMs: t("6:02"), endMs: t("8:19") },
    { title: "Patrolling, acknowledgments and messaging", startMs: t("8:19"), endMs: EDITOR_ROUNDTABLE_MS },
  ],
};

const SYNC_FEB_MS = 888_900;

const weeklySyncFeb: SeedMeeting = {
  videoKey: "Weekly sync — 2026-02-19.mp4",
  transcriptFile: "weekly-sync-2026-02-19.txt",
  format: "block",
  title: "Weekly sync — 2026-02-19",
  description:
    "CiviWiki weekly sync: merged pull requests, the new test framework, plans for continuous integration, and the data model for Milestone 2.",
  // Date from the file name; the recording itself says Monday, February 19th, 2018.
  recordedAt: new Date("2026-02-19T00:00:00Z"),
  durationMs: SYNC_FEB_MS,
  folder: "Engineering",
  tags: ["Weekly Sync", "Engineering"],
  speakers: [
    { name: "Briley Christopher Oxley", role: null },
    { name: "Mitchell West", role: null },
  ],
  summaries: {
    AI_NOTES: {
      overview:
        "Briley and Mitchell reviewed recently merged pull requests, including a first-time contribution and the new automated test framework, agreed to pursue continuous integration, and discussed the data model behind Milestone 2.",
      sections: [
        {
          heading: "Merged pull requests",
          points: [
            { text: "Older maintenance PRs were merged: undefined variables and reorganized imports.", timestampMs: t("0:33") },
            {
              text: "PR #145 from first-time contributor Stephen Hitchcock updates the About Us page and links the GitHub repository.",
              timestampMs: t("1:12"),
            },
            { text: "The team plans to thank and welcome Stephen publicly.", timestampMs: t("1:37") },
          ],
        },
        {
          heading: "Test framework",
          points: [
            {
              text: "Peter, a developer from Poland, built automated tests and found several bugs; he's open to long-term maintenance.",
              timestampMs: t("2:48"),
            },
            {
              text: "Some tests rely on low-level DOM paths; adding HTML IDs and classes would fix this and makes good first issues.",
              timestampMs: t("4:10"),
            },
          ],
        },
        {
          heading: "Continuous integration",
          points: [
            { text: "Run the test suite automatically on merges to branches like dev and test.", timestampMs: t("5:13") },
            { text: "May hire a developer familiar with Travis or Jenkins; Briley will open a GitHub issue.", timestampMs: t("5:35") },
            { text: "Failing tests would fail the build and block the merge.", timestampMs: t("6:27") },
            { text: "Darius set up a basic Jenkins system earlier; Mitchell may reach out to him.", timestampMs: t("7:14") },
          ],
        },
        {
          heading: "Milestone 2 and the data model",
          points: [
            {
              text: "Milestone 2 is close: link solutions to bill text and the level of government action needed.",
              timestampMs: t("8:12"),
            },
            { text: "Each issue thread could become a dataset of support for solutions.", timestampMs: t("9:20") },
            {
              text: "Store problems, causes and solutions in separate tables linked by foreign keys, with the same constraints in the UI.",
              timestampMs: t("10:24"),
            },
            { text: "Problems sit at the top; causes link upward; solutions link to causes.", timestampMs: t("11:19") },
          ],
        },
      ],
    },
    MEETING_MINUTES: {
      attendees: ["Briley Christopher Oxley", "Mitchell West"],
      agenda: ["Merged pull requests", "Test framework", "Continuous integration", "Milestone 2 and the data model", "Community outreach"],
      discussion: [
        {
          topic: "Merged pull requests",
          notes: "Maintenance PRs merged, plus PR #145 from first-time contributor Stephen Hitchcock.",
          timestampMs: t("0:33"),
        },
        {
          topic: "Test framework",
          notes: "Peter's automated tests are merged. Brittle element selectors can be fixed by adding HTML IDs and classes.",
          timestampMs: t("2:06"),
        },
        {
          topic: "Continuous integration",
          notes: "Run tests on every merge to key branches and block merges on failures; possibly hire a developer for it.",
          timestampMs: t("5:13"),
        },
        {
          topic: "Milestone 2 and the data model",
          notes: "Link solutions to bills; model problems, causes and solutions as linked tables with enforced relationship rules.",
          timestampMs: t("8:12"),
        },
        {
          topic: "Community outreach",
          notes: "Keep labeling good first issues and help-wanted tasks, tweeting and releasing videos.",
          timestampMs: t("14:02"),
        },
      ],
      decisions: [
        { text: "Open a GitHub issue for setting up continuous integration.", timestampMs: t("5:46") },
        { text: "Focus next week's meeting on pushing through to Milestone 2.", timestampMs: t("8:12") },
      ],
      nextSteps: [
        { text: "Briley: create the continuous integration issue.", timestampMs: t("5:35") },
        { text: "Mitchell: reach out to Juhi on Thursday.", timestampMs: t("7:46") },
        { text: "Mitchell: draft a model for displaying issue-thread data for next week's meeting.", timestampMs: t("13:23") },
      ],
    },
    SUMMARY: {
      tldr: "The automated test framework is merged and the team will set up continuous integration next; Milestone 2 is close, and Mitchell will draft how issue-thread data should be modeled and displayed.",
      keyPoints: [
        { text: "First-time contributor Stephen Hitchcock's PR #145 was merged.", timestampMs: t("1:12") },
        { text: "Peter's automated test framework is merged.", timestampMs: t("2:06") },
        { text: "Continuous integration is next, possibly with a hired developer.", timestampMs: t("5:13") },
        { text: "Problems, causes and solutions will be modeled as linked tables.", timestampMs: t("10:24") },
      ],
    },
    CUSTOMER_FEEDBACK: {
      context: "Internal developer sync for the CiviWiki open source project. No customer feedback was discussed.",
      feedback: [],
      painPoints: [{ text: "Tests have to locate elements through low-level DOM paths.", timestampMs: t("4:10") }],
      requests: [],
    },
    PROJECT_MEETING: {
      goal: "Reach Milestone 2: a simplified issue thread that links solutions to bills.",
      // "I think we're really close on getting our ... simplified issue thread working."
      status: "on_track",
      workstreams: [
        { name: "Continuous integration setup", owner: null, due: null, timestampMs: t("5:13") },
        { name: "Link solutions to bill text", owner: null, due: null, timestampMs: t("8:26") },
        { name: "Issue-thread data display model", owner: "Mitchell West", due: "Next week's meeting", timestampMs: t("13:23") },
        { name: "HTML IDs and classes for testing", owner: null, due: null, timestampMs: t("4:34") },
      ],
      risks: [
        {
          text: "Tests depend on brittle low-level DOM paths.",
          mitigation: "Add HTML IDs and classes, offered as good first issues.",
          timestampMs: t("4:10"),
        },
        {
          text: "Setting up CI could take months instead of days or weeks.",
          mitigation: "Hire a developer familiar with Travis or Jenkins.",
          timestampMs: t("6:47"),
        },
      ],
      nextMilestone: { text: "Milestone 2: simplified issue thread with solutions linked to bills.", timestampMs: t("8:12") },
    },
  },
  actionItems: [
    {
      description: "Create a GitHub issue for setting up continuous integration.",
      assignee: "Briley Christopher Oxley",
      timestampMs: t("5:35"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Thank and welcome first-time contributor Stephen Hitchcock.",
      assignee: "Briley Christopher Oxley",
      timestampMs: t("1:37"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Ask Darius about the Jenkins system he set up earlier.",
      assignee: "Mitchell West",
      timestampMs: t("7:14"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Reach out to Juhi on Thursday.",
      assignee: "Mitchell West",
      timestampMs: t("7:46"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Draft a model for displaying issue-thread data and present it next week.",
      assignee: "Mitchell West",
      timestampMs: t("13:23"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Keep labeling good first issues and help-wanted tasks.",
      assignee: null,
      timestampMs: t("14:02"),
      dueDate: null,
      completed: false,
    },
  ],
  annotations: [
    {
      type: "HIGHLIGHT",
      segmentStartMs: t("6:27"),
      quote: "if any of the tests fail, it'll fail the build",
      note: null,
    },
    {
      type: "NOTE",
      segmentStartMs: t("11:19"),
      quote: "Problems are the top level.",
      note: "Proposed hierarchy: problems at the top, causes link upward, solutions link to causes.",
    },
    {
      type: "NEEDS_REVIEW",
      segmentStartMs: t("0:01"),
      quote: "Today is Monday, February 19th, 2018.",
      note: "The recording says 2018, but the file is dated 2026-02-19.",
    },
  ],
  timeline: [
    { title: "Merged pull requests and a new contributor", startMs: t("0:01"), endMs: t("2:06") },
    { title: "Test framework and continuous integration", startMs: t("2:06"), endMs: t("7:46") },
    { title: "Milestone 2 and the data model", startMs: t("7:46"), endMs: t("13:50") },
    { title: "Wrap-up and community outreach", startMs: t("13:50"), endMs: SYNC_FEB_MS },
  ],
};

const SYNC_APR_MS = 685_500;

const weeklySyncApr: SeedMeeting = {
  videoKey: "Weekly sync — 2026-04-30.mp4",
  transcriptFile: "weekly-sync-2026-04-30.txt",
  format: "block",
  title: "Weekly sync — 2026-04-30",
  description:
    "CiviWiki weekly sync: front-end componentization, the Django REST Framework pull request, app structure, contributor updates and milestone 0.2.",
  // Date from the file name; the recording itself says Monday, May 28th, 2018.
  recordedAt: new Date("2026-04-30T00:00:00Z"),
  durationMs: SYNC_APR_MS,
  folder: "Engineering",
  tags: ["Weekly Sync", "Engineering"],
  speakers: [
    { name: "Briley Christopher Oxley", role: null },
    { name: "Juhe Lee", role: null },
  ],
  summaries: {
    AI_NOTES: {
      overview:
        "Briley and Juhe went through Juhe's developer report: front-end componentization, the approved Django REST Framework pull request, and whether to split the Django project into several apps. They also covered contributors, milestone 0.2 and pending reviews.",
      sections: [
        {
          heading: "Developer report",
          points: [
            { text: "Juhe expects to finish the front-end componentization by tonight or early tomorrow.", timestampMs: t("0:24") },
            { text: "The Django REST Framework endpoints PR is approved; Briley has reviewed it.", timestampMs: t("0:52") },
            { text: "Merging it closes issue 120 (REST API endpoints for Threads).", timestampMs: t("6:01") },
          ],
        },
        {
          heading: "App structure",
          points: [
            {
              text: "Briley raised splitting the single API app into several apps organized around the domain model.",
              timestampMs: t("1:17"),
            },
            {
              text: "Juhe: the simple API structure is easier for now given the cleanup backlog, but open to exploring it.",
              timestampMs: t("2:07"),
            },
          ],
        },
        {
          heading: "Web components",
          points: [
            { text: "Shadow DOM is becoming a standard feature in Firefox.", timestampMs: t("3:37") },
            {
              text: "Briley hopes the component work moves toward real web components over time.",
              timestampMs: t("4:18"),
            },
          ],
        },
        {
          heading: "Contributors and milestone 0.2",
          points: [
            {
              text: "Joe may leave for school; Gordon is fixing backend bugs in milestone 0.2, such as vote counters and API deprecations.",
              timestampMs: t("6:26"),
            },
            { text: "The psycopg bug only needs a version bump, a good first task.", timestampMs: t("7:22") },
            { text: "About 25 issues remain on 0.2; some can move to 0.3.", timestampMs: t("7:28") },
            {
              text: "PR #197 (sharing button) still needs front-end testing before Juhe finishes the review.",
              timestampMs: t("8:42"),
            },
          ],
        },
      ],
    },
    MEETING_MINUTES: {
      attendees: ["Briley Christopher Oxley", "Juhe Lee"],
      agenda: ["Developer report", "App structure", "Web components", "Contributors and milestone 0.2", "Pending reviews"],
      discussion: [
        {
          topic: "Developer report",
          notes: "Componentization nearly done; the approved Django REST Framework PR is ready to merge.",
          timestampMs: t("0:24"),
        },
        {
          topic: "App structure",
          notes: "Splitting into domain-oriented apps is worth exploring later; the simple structure stays for now.",
          timestampMs: t("1:17"),
        },
        {
          topic: "Contributors and milestone 0.2",
          notes: "Joe may leave; Gordon has backend bugs assigned. About 25 issues remain on 0.2.",
          timestampMs: t("6:14"),
        },
        {
          topic: "Pending reviews",
          notes: "PR #197 needs front-end testing first. The About Us page has a capitalization error and the wrong assignee.",
          timestampMs: t("7:51"),
        },
      ],
      decisions: [
        { text: "Merge the initial Django REST Framework work.", timestampMs: t("3:37") },
        { text: "Defer some milestone 0.2 issues to 0.3.", timestampMs: t("7:28") },
        { text: "Hold the REST Framework merge until conflicts with new updates are resolved.", timestampMs: t("10:19") },
      ],
      nextSteps: [
        { text: "Juhe: finish the componentization pull request.", timestampMs: t("9:54") },
        { text: "Juhe: work on documentation issues for 0.2.", timestampMs: t("9:54") },
        { text: "Juhe: peer review the sharing-button PR after front-end testing.", timestampMs: t("8:51") },
      ],
    },
    SUMMARY: {
      tldr: "Juhe is close to finishing the front-end componentization and will merge the Django REST Framework work once conflicts are resolved; the team will trim milestone 0.2 by deferring some issues to 0.3.",
      keyPoints: [
        { text: "Front-end componentization is nearly done.", timestampMs: t("0:24") },
        { text: "The approved REST Framework PR waits on conflict resolution.", timestampMs: t("10:19") },
        { text: "Splitting the Django project into several apps is worth exploring later.", timestampMs: t("3:12") },
        { text: "About 25 issues remain on milestone 0.2; some move to 0.3.", timestampMs: t("7:28") },
      ],
    },
    CUSTOMER_FEEDBACK: {
      context: "Internal developer sync for the CiviWiki open source project. No customer feedback was discussed.",
      feedback: [],
      painPoints: [
        { text: "The original front-end structure was confusing for new developers.", timestampMs: t("4:50") },
        { text: "Rebasing long-running PRs is tricky and sometimes needs a merge commit.", timestampMs: t("10:54") },
      ],
      requests: [],
    },
    PROJECT_MEETING: {
      goal: "Finish milestone 0.2.",
      status: null,
      workstreams: [
        { name: "Front-end componentization", owner: "Juhe Lee", due: "Tonight or early tomorrow", timestampMs: t("0:24") },
        { name: "Django REST Framework endpoints", owner: "Juhe Lee", due: null, timestampMs: t("0:52") },
        { name: "Milestone 0.2 backend bugs", owner: "Gordon", due: null, timestampMs: t("6:26") },
        { name: "Documentation issues for 0.2", owner: "Juhe Lee", due: "This week", timestampMs: t("9:54") },
      ],
      risks: [
        { text: "Contributor Joe may leave the project.", mitigation: null, timestampMs: t("6:26") },
        {
          text: "The REST Framework PR conflicts with newly pulled updates.",
          mitigation: "Resolve the conflicts, rebase or create a merge commit.",
          timestampMs: t("10:19"),
        },
      ],
      nextMilestone: { text: "Milestone 0.2, with some issues deferred to 0.3.", timestampMs: t("7:28") },
    },
  },
  actionItems: [
    {
      description: "Finish and push the front-end componentization.",
      assignee: "Juhe Lee",
      timestampMs: t("0:24"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Resolve conflicts and merge the Django REST Framework pull request.",
      assignee: "Juhe Lee",
      timestampMs: t("10:19"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Run front-end tests and finish the review of the sharing-button PR.",
      assignee: "Juhe Lee",
      timestampMs: t("8:42"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Work on documentation issues for milestone 0.2.",
      assignee: "Juhe Lee",
      timestampMs: t("9:54"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Defer some milestone 0.2 issues to 0.3.",
      assignee: "Briley Christopher Oxley",
      timestampMs: t("7:28"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Update the psycopg version.",
      assignee: null,
      timestampMs: t("7:22"),
      dueDate: null,
      completed: false,
    },
    {
      description: "Fix the project name's capitalization and the assignee on the About Us page.",
      assignee: null,
      timestampMs: t("7:55"),
      dueDate: null,
      completed: false,
    },
  ],
  annotations: [
    {
      type: "HIGHLIGHT",
      segmentStartMs: t("2:07"),
      quote: "I think having it a simple API structure makes it a little easier to kind of do housekeeping for now",
      note: null,
    },
    {
      type: "NEEDS_REVIEW",
      segmentStartMs: t("8:51"),
      quote: "should I assign you to that peer review for 119?",
      note: "The PR discussed at 8:25 is number 197. Confirm which one Juhe is reviewing.",
    },
    {
      type: "NEEDS_REVIEW",
      segmentStartMs: t("0:01"),
      quote: "Today is Monday, May 28th, 2018.",
      note: "The recording says May 28, 2018, but the file is dated 2026-04-30.",
    },
  ],
  timeline: [
    { title: "Componentization and the REST Framework PR", startMs: t("0:01"), endMs: t("1:17") },
    { title: "Restructuring the Django app", startMs: t("1:17"), endMs: t("3:37") },
    { title: "Web components and closing issues", startMs: t("3:37"), endMs: t("6:14") },
    { title: "Contributors, milestone 0.2 and reviews", startMs: t("6:14"), endMs: SYNC_APR_MS },
  ],
};

export const seedMeetings = [productLaunch, boardSeats, editorRoundtable, weeklySyncFeb, weeklySyncApr];
