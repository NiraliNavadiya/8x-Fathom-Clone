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
