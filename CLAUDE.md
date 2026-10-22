## UI/UX Design System Guidelines

Inspect the existing project and implement a consistent, premium dark UI for the Fathom clone.

### 1. Global Theme
Create a centralized `globals.css` and configure Tailwind CSS properly.

- **Primary:** Warm orange for important actions and active states.
- **Background:** Near-black, not pure black.
- **Surfaces:** Layered charcoal for cards, sidebars, and dialogs.
- **Text:** Warm white for primary text, muted gray for secondary text.
- **Borders:** Subtle charcoal.
- Define reusable color, typography, spacing, radius, shadow, and transition tokens using CSS variables.
- Use consistent font sizes, weights, line heights, and spacing throughout.

### 2. Global Design Page
Add a `/design-system` page named **Global Design** to preview the actual tokens and components: colors, typography, buttons, inputs, cards, badges, breadcrumbs, loading states, and skeletons.

Keep this page connected to the real design system, not a separate mockup.

### 3. Components and Hooks
Create reusable components and hooks **only when needed or when logic is genuinely shared**. Avoid premature abstraction and unnecessary files.

Maintain consistent component variants, accessibility, and interaction states.

### 4. Navigation
Use consistent application navigation and breadcrumbs on nested pages. Ensure links, active states, page titles, and back navigation work correctly.

### 5. Animation
Use the installed Framer Motion/Motion library for subtle page transitions, dialogs, dropdowns, and interaction feedback. Respect reduced-motion preferences. Avoid excessive animation.

### 6. Loading and States
Implement a consistent loading indicator and content-shaped skeletons where needed. Include appropriate empty, error, success, disabled, and loading states. Prevent layout shifts.

### 7. Apply and Verify
Apply the design system across existing pages, including the dashboard, meeting details, transcript, and search. Preserve working functionality and database integration.

Test responsive layouts, navigation, interactions, and accessibility. Run relevant tests and `npm run build`; fix failures.

**Work directly in the codebase. Keep the implementation simple, cohesive, and maintainable. Do not build components or abstractions before they are needed.**
