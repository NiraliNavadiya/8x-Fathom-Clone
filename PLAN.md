Development roadmap

Phase 1 — Foundation and setup
Start here
- Verify agent-capture setup and both canary tests.
- Check Next.js, TypeScript, Tailwind, and shared design tokens.
- Connect Neon PostgreSQL and private Object Storage.
- Add initial schema, migrations, loading states, error handling, and test setup.
- Verify the production build.




Phase 2 — App layout and onboarding
- Onboarding and initial app entry.
- Consistent navigation and page layouts.
- Black background (#0A0A0B), orange accent (#F97316), consistent fonts, spacing, borders, and reusable components.
- Loading, empty, error, and responsive states.




Phase 3 — My Calls dashboard
- Meeting tiles with title, time, speakers, and meeting-type tags meeting duration.
- Search by meeting name and tags.
- Copy, delete, and share actions. both vertical dot icon menu and  on hover tile show this action items
- Create folders and add meetings to existing folders. (Folders page is different )
- Top navigation: All Calls, Folders, and search.
- Keyboard shortcuts for navigating pages.
- Floating Ask Meetly button. - open ask ai side panel , in this search through transcript of all meeting , also suggest 2-3 example to search from meeting transcripts , smooth open close animation , use gemini api key 



Phase 4 — Meeting detail page
- Meeting title, editable description, speaker names, and folder assignment.
- Left tabs: Summary, Transcript, Ask Meetly.
- Right side: video player and horizontal timeline.
- Connect your two uploaded videos to meeting records.
- Synchronize transcript clicks with video timestamps.
- Can add meeting to folder - existing or create one
- Templates ⭐ ( open dropdown in summary button )
    - AI Notes
    - Meeting minutes
    - summary
    - customer feedback
    - project meeting
  - - From transcript person can highlight and other annotations like needs review and show this annotated part in video timeline also
  - From list of highlights person can go to specific time in audio same in another annotations and same in transcript - from text to audio
  - and right side top  video and bottom horizontal timeline - maximum 4 sections and below that cards of actions items ( person wise ) and annotations list highlights ( text ) - needs review
  - User can edit action item and show all persons action items by default and also show filter and person can change assignee
  - Delete action items and annotations


Phase 4A — Summaries and templates

 — Meeting Detail Page in Meetly. First inspect the existing code, database schema, and components. Reuse existing work and avoid breaking other features.

### 1. Meeting details and folders
- Display the meeting title, editable description, date, duration, meeting type/tags, and speaker names.
- Allow users to assign a meeting to an existing folder or create a new folder.
- Save edits to the database and provide clear save feedback.

### 2. Video player
- Connect both uploaded Neon Storage videos to their correct meeting records. Verify the actual storage keys; never guess.
- Keep private videos secure.
- Provide playback controls, progress bar, current time/duration, volume, and seeking.
- Use a clean, responsive player with consistent styling.

### 3. Page layout
- **Left panel:** Summary, Transcript, and Ask Meetly tabs.
- **Right panel, in this exact vertical order:**
  1. Video player.
  2. Horizontal timeline directly below the video, with a maximum of four sections.
  3. Action-item cards grouped by person.
  4. Highlights and annotations lists, including Needs Review.
- Do not place action items or annotation lists beside or above the video.
- Use sensible spacing, clear section headings, readable typography, and responsive layouts.

### 4. Summary and templates
- Add a template dropdown in the Summary tab with:
  - AI Notes
  - Meeting Minutes
  - Summary
  - Customer Feedback
  - Project Meeting
- Make switching templates easy and clearly indicate the selected template.
- Store each template's content separately for each meeting.
- I will provide both exact transcripts. Use transcript content for summaries; do not invent meeting facts or pretend placeholder content is AI-generated.

### 5. Transcript
- Display readable transcript segments with timestamps and speaker names, visually distinguishing speakers.
- Preserve the exact transcript wording I provide, without rewriting, correcting, or omitting words.
- Make timestamps clickable and structure segments for video synchronization in Phase 4B.

### 6. Visual quality and completion
- Follow the existing theme: background #0A0A0B, orange accent #F97316, subtle borders, dark surfaces, and consistent fonts.
- Use polished hover/focus states, accessible controls, and subtle 150–200 ms transitions; respect reduced-motion preferences.
- Include loading, empty, and error states.
- Reuse the existing schema and make only necessary, non-destructive changes.
- Test both meeting records and video playback, then run `npm run build`.

Finish and verify Phase 4A before starting Phase 4B. Report any incomplete functionality honestly.



---

Implement Phase 4B — Interactive Meeting Features in Meetly, building on Phase 4A. Inspect existing models and components first; reuse them rather than creating duplicate systems.

### 1. Video and transcript synchronization
- Clicking a transcript segment seeks the video to its timestamp.
- Keep the current transcript segment highlighted as the video plays.
- Seeking the video updates the displayed playback position and active transcript segment.
- Handle missing timestamps gracefully.

### 2. Interactive timeline
- Display a horizontal timeline below the video, with a maximum of four sections.
- Show timestamped markers for action items, highlights, notes, and Needs Review annotations.
- Give marker types distinct, accessible visual styles and useful hover labels.
- Clicking a marker seeks the video to the corresponding timestamp.
- Keep markers synchronized when their associated items are edited or deleted.

### 3. Highlights and annotations
- Let users select transcript text and create a Highlight, Note, or Needs Review annotation.
- Store the selected text, type, timestamp, meeting ID, and linked transcript segment when available.
- Show highlights and annotations as readable lists below the action-item cards, with Needs Review clearly identifiable.
- Clicking any item jumps to its timestamp in the video.
- Allow users to edit and delete annotations, with confirmation for destructive actions where appropriate.
- Show clear feedback when changes are saved or fail.

### 4. Action-item management
- Display all action items by default, grouped by assignee.
- Provide a person filter without hiding items by default.
- Let users edit item descriptions and supported fields, change assignees, and delete items.
- Display timestamps when available and connect items to timeline markers.
- Update the database and UI immediately after successful changes; handle errors without silently losing edits.

### 5. Usability and testing
- Keep controls consistent with Meetly's black/orange theme and Phase 4A layout.
- Provide intuitive empty states, loading indicators, accessible buttons, clear focus states, and responsive behavior.
- Ensure transcript clicks, playback, timeline markers, annotations, and action items all use consistent timestamps.
- Test creating, editing, deleting, filtering, and seeking, including missing timestamps and failed database operations.
- Run relevant tests and `npm run build`. Fix regressions and report what was actually verified.

Do not fabricate transcript content or timestamps, replace existing data, or claim features work without testing them.

---








Phase 5 — Summaries and templates

Add selectable summary templates:
- AI Notes
- Meeting Minutes
- Summary
- Customer Feedback
- Project Meeting
Each template should produce a distinct output structure, with a useful sample fallback if AI credentials are unavailable.




Phase 6 — Transcript annotations and timeline
- Select transcript text and create highlights, notes, and Needs Review annotations.
- Display annotation markers on the video timeline.
- Click a marker or annotation to jump to the correct timestamp.
- Limit timeline sections to a maximum of 4.
- Edit and delete annotations.
- List highlights and review items beneath the timeline.




Phase 7 — Action items
- Show all action items by default, grouped by person.
- Filter by assignee.
- Edit task descriptions and change assignees.
- Delete action items.
- Link items to relevant meeting timestamps when available.




Phase 8 — Ask Meetly
- Smoothly open and close a right-side panel.
- Answer questions using the current meeting's transcript and summary.
- Include timestamp references where possible.
- Handle loading, errors, and empty conversations.




Phase 9 — Sharing
- Share a summary through Gmail.
- Share the whole meeting.
- Public links and restricted access for selected recipients.
- Secure access checks and revocation where applicable.




Phase 10 — Final QA and deployment
- Test all 13 required feature groups.
- Test video playback, timestamp navigation, CRUD actions, search, folders, and sharing permissions.
- Check responsive layouts, keyboard shortcuts, and reduced-motion support.
- Fix production build errors and deploy to Vercel.
- Verify the live deployment and prepare a demo flow.


share
search - done
deploy
list of upcoming meeting - join meeting
navbar repositioning
smooth scrolling
subtle colors

### Upcoming Meetings Page — UI/UX

- Use the existing dark theme and consistent page layout.
- Show a clear page title, short description, and meeting count.
- Display meetings as compact horizontal cards with a date badge on the left, meeting title and schedule in the center, and an orange **Join** button on the right.
- Use subtle borders, charcoal surfaces, balanced spacing, and clear typography.
- Clicking **Join** opens a small confirmation dialog with meeting details and Cancel/Join actions. Open the actual meeting link in a new tab.
- Include loading skeletons, a helpful empty state, and error handling.
- Keep the layout responsive and consistent with the rest of the app. Avoid unnecessary UI elements or decorative icons.
