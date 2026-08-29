# Ghibli AI — the interface

The React front end of **Ghibli AI**: upload a photo or type a sentence, pick one of six
film-named styles, and get a Ghibli-looking PNG back. It also keeps every image you make, keeps
you signed in across a refresh, and tells you *which* of seven upstream failures just happened
instead of printing one flat sentence for all of them.

This file is about the interface — the routes, the pages, the interactions, and the handful of
features that only become visible when something goes wrong. The data model, the request flow and
the API contract live in [the backend README](../ghbliapi/README.md).

| | |
| --- | --- |
| **Stack** | React 19 · react-router-dom 7 · Vite 5 · Tailwind CSS 3 |
| **HTTP** | `fetch` only — no axios, no data-fetching library |
| **State** | React state plus three plain modules: `authStorage`, `generationDraftStore`, `generationEvents` |
| **Tests** | vitest + jsdom + Testing Library — `npm test` |
| **Deploy** | Vercel, SPA rewrite in [`vercel.json`](vercel.json) |

## Contents

1. [The two applications](#the-two-applications)
2. [Routes](#routes)
3. [The pages](#the-pages)
4. [Features that are not visible until they matter](#features-that-are-not-visible-until-they-matter)
5. [Design system](#design-system)
6. [Tech stack](#tech-stack)
7. [Setup](#setup)
8. [Tests and build](#tests-and-build)
9. [Deployment](#deployment)
10. [Screenshots](#screenshots)
11. [Project layout](#project-layout)
12. [License](#license)

## The two applications

| Folder | What it is |
| --- | --- |
| `ghbli-art-generator` | This app. React + Vite, deployed to Vercel. |
| `ghbliapi` | Spring Boot + MongoDB + Stability AI, deployed to Render. [Its README](../ghbliapi/README.md) covers the models, the request flow and the error contract. |

Nothing is shared between them at build time. The only contract is HTTP: multipart or JSON in,
`image/png` or `application/problem+json` out.

## Routes

Every route is declared in [`src/App.jsx`](src/App.jsx). Two things are worth reading off the
table rather than the file: five paths render **one** `HomePage` and differ only in which section
they scroll to, and `*` is a real 404 rather than a silent fallback to the landing page.

| Path | Renders | Notes |
| --- | --- | --- |
| `/` `/home` `/features` `/gallery` `/faq` | `HomePage` | One page, five entry points. Each path scrolls to its own section with its own offset (`/home` 96px, `/features` 16px, `/gallery` 16px, `/faq` 72px) so the sticky header never covers the heading. |
| `/login` | `LoginPage` | Redirects to `state.from` — or `/create` — once signed in. |
| `/signup` | `SignupPage` | Same redirect rule; signup returns a usable token, so there is no second login round trip. |
| `/legal` `/terms` `/privacy` | `LegalPage` | Three paths, one page, two halves. All three open at the top. |
| `/create` | `CreatePage` | Behind `ProtectedRoute`. Reads `?tab=photo` / `?tab=text`. |
| `/history` | `HistoryPage` | Behind `ProtectedRoute`. |
| `*` | `NotFoundPage` | Was `HomePage`, which made every typo look like a successful navigation — `/signin` showed the landing page with no hint that the route did not exist. |

Two ordering details in `App.jsx` are load-bearing:

- **`AuthProvider` sits inside `BrowserRouter`.** It calls `useNavigate` for the 401 bounce, and a
  hook that needs router context cannot live above the router.
- **`ScrollToTop` watches `pathname` only, and only for a listed route.** `SCROLL_TO_TOP_ROUTES`
  names `/create`, `/login`, `/signup`, `/history`, `/legal`, `/terms`, `/privacy` — the pages that
  should always open at the top. The five `HomePage` paths are deliberately absent, because for
  them the *point* is to land mid-page.

Because that watcher ignores the query string, a footer link to `/create?tab=text` while already on
`/create` scrolls nothing on its own; `CreatePage` re-applies the param and scrolls itself.

## The pages

### Home — `/`, `/home`, `/features`, `/gallery`, `/faq`

Eight sections in [`HomePage.jsx`](src/components/HomePage.jsx), in this order:

`Header` → `HeroSection` → `FeaturesSection` → `GallerySection` → `DetailSection` →
`InspirationSection` → `FaqSection` → `CtaSection` → `Footer`

**Hero.** One promise — *Transform Your Photos into Ghibli Art with Ghibli AI* — and three glass
pills under it that say what the product actually is, in the order a visitor cares about:
"Photo or text prompt", "Six film-inspired styles", "Results in seconds". The CTA is an in-page
anchor to `#create`, which is the `CtaSection` band at the bottom; the button that leaves the page
is in the header.

**Features.** Three cards from `data/homeData.js`, each with an inline SVG at `strokeWidth="1.8"`
— accuracy, speed, resolution.

**Magical Transformations Gallery.** Eight tiles in three groups: a four-up row, then two cards
titled *Nature Ghibli Style* and *Studio Ghibli Scene* holding two tiles each. All eight open the
same lightbox. Two details make this more than a picture wall:

- Each tile carries a `type` and a `style` drawn from the values the backend really stores
  (`IMAGE_TO_IMAGE`, `TEXT_TO_IMAGE`, `digital_art`, `anime`), and its caption is rendered by the
  *same* `typeLabel` / `styleLabel` helpers a history card uses. So "Text to Art · Princess
  Mononoke" in the gallery reads identically to a row that came out of the API.
- The pixel dimensions in the lightbox are measured off the loaded `<img>` rather than hardcoded,
  so a swapped asset cannot make the caption lie.

**Photo to Ghibli Art** (`DetailSection`) is the long-form pitch: three cards on the left, the P1
artwork on the right, stretched to the full row height so its bottom edge lines up with the last
card rather than stopping short.

**Whispers of the Wind** (`InspirationSection`) is the one interaction on the page that is not a
lightbox. Four landscapes and four film quotes; clicking a small tile **swaps** it with the large
panel — a true swap, not "move to front", so the two tiles you did not click keep their places.
The caption row underneath is ordered by the current arrangement, so a caption always travels with
its image. Every picture here is decorative and inert: the enlarge-to-inspect interaction belongs
to the gallery, and duplicating it here would blur what each section is for.

**FAQ** is four cards, two-up from `md`. **CTA** is the `#create` band the hero points at. Both
`Header` and `Footer` share the same route→section map and the same offsets, so a nav click and a
footer click land in exactly the same place.

**Header.** A sticky `.glass-panel` bar. Anonymous visitors get Log in / Sign up from `sm` up; a
signed-in user gets a single account menu holding their name, their email, History, Create and a
red Log out row. The five nav links appear inline from `lg` and otherwise live inside that same
menu — a five-link row needs ~740px and used to overflow at 768px. The panel closes on route
change, on Escape, and on `mousedown` outside it (`mousedown`, not `click`, so a drag that starts
inside the panel and ends outside is not treated as a dismissal). It is a disclosure, not an ARIA
`menu`: `role="menu"` would oblige arrow-key handling that four plain links do not need.

**Footer.** Brand block, a Features column whose two links carry `?tab=` so they open the right
tab, and a Legal column pointing at `/terms` and `/privacy` — which used to point at `/home`,
because there was no legal page at all.

### Create — `/create`

Two tabs over one page, plus a server-backed strip underneath both.

**Photo to Art** ([`PhotoToArtSection.jsx`](src/components/PhotoToArtSection.jsx)) — a
drag-and-drop zone that also accepts a click-to-browse, an "Additional Details" textarea, and a
Transform button that stays disabled until there is both a file and a non-empty description. The
5 MB cap is checked here *before* the request, so an oversized file never leaves the browser; the
backend enforces the same limit independently.

**Text to Art** ([`TextToArtSection.jsx`](src/components/TextToArtSection.jsx)) — a style dropdown
and a description textarea. Six options, named after the films rather than after the Stability
presets they map to:

| What the dropdown says | What is stored and sent |
| --- | --- |
| General Ghibli | `general` |
| Analog Film | `analog_film` |
| Spirited Away | `cinematic` |
| Howl's Moving Castle | `fantasy_art` |
| My Neighbor Totoro | `anime` |
| Princess Mononoke | `digital_art` |

The right-hand values are Stability's own style presets, and the mapping is fixed in one place —
[`utils/generationLabels.js`](src/utils/generationLabels.js) — so the dropdown, a history card and
a gallery caption can never disagree about what `digital_art` is called.

Both tabs end the same way: the result panel with **Download** and **Create Another**. Download
builds the filename client-side, because `Content-Disposition` is not a CORS-safelisted response
header and the backend exposes no custom headers — so the browser could not read a server-supplied
name even if one were sent.

Which tab is open is remembered per user, so leaving `/create` and coming back reopens the tab that
holds a result. An explicit `?tab=` wins over that memory; anything else in the parameter is
ignored rather than trusted.

**Recent creations** ([`RecentGenerations.jsx`](src/components/RecentGenerations.jsx)) renders
*outside* the tab swap, and that is the whole reason it exists. Switching tabs unmounts the
inactive section, so before this strip a generation you had just waited for could vanish on a tab
click. It reads four rows from the server, refreshes itself when a new generation completes, and
links to `/history` — labelled "View all 7 →" using `totalElements` from the response envelope, not
a count the client kept. Its failure state is deliberately one quiet line rather than the panel
`/history` shows: a history fetch that failed must not make the generator look broken.

### History — `/history`

Everything you have made, newest first, twelve per page. The grid steps 1 → 2 → 3 → 4 columns
across `sm` / `lg` / `xl`, and each card carries the prompt, a type badge, the style, the pixel
dimensions, the file size and the date.

Four states, all explicit, because three of them look identical if you do not separate them:

| State | What you see |
| --- | --- |
| Loading | Six skeleton cards shaped like the real thing, so the grid does not jump when rows land |
| Error | A card naming the backend's own `detail`, with a Try again button |
| Empty | "No generations yet" plus a link to `/create` — distinguished from *not loaded yet* |
| Populated | The grid, plus pagination only when there is more than one page |

Per-card actions are **Download** and **Delete**. Delete is a two-step "Delete → Sure?" inside the
card rather than a `window.confirm`, and it is not optimistic: deleting shifts every later row
forward, so the view refetches instead of splicing a row out locally — otherwise a twelve-item page
would sit there showing eleven while item thirteen stayed invisible. Deleting the only row on a page
past the first steps back a page instead.

Only one lightbox can be open at a time, so `expandedId` lives in the page rather than in the card.
The card still owns the blob URL the lightbox renders, and stays mounted while expanded, so the URL
cannot be revoked out from under the overlay.

### Log in and Sign up — `/login`, `/signup`

Two forms, one redirect rule, shared through [`utils/authRedirect.js`](src/utils/authRedirect.js) so
they cannot drift: land on `state.from` if there is one, otherwise `/create`. Signing up instead of
logging in therefore still returns you to the page you were aiming at. `/login` and `/signup` are
excluded as redirect targets on purpose — without that guard, a 401 raised while sitting on an auth
page would make that page its own destination, and you would appear to sign in successfully and go
nowhere.

**Signup** states its rules where the rule is enforced: the password placeholder reads *At least 8
characters* and the helper line under it reads *8–72 characters.* The maximum is not cosmetic —
BCrypt silently truncates its input at 72 bytes, so two long passwords sharing a prefix would
otherwise both authenticate. `maxLength` is set on all three inputs to mirror the backend DTO (name
100, email 254, password 72). A 400 paints the offending fields red and prints the backend's
per-field message; a 409 adds a "Sign in instead" link that carries `state` across, so the redirect
target survives the detour.

**Login** shows one error string for every credential failure — *Incorrect email or password.*,
straight from the API, which deliberately does not reveal whether the address exists. Inventing
something more specific here would leak more than the API does. Above the form, an amber notice
reads "Your session ended. Please sign in again to continue." when you arrived by way of an expired
token; it is latched on first render and consumed once shown, so choosing to visit `/login` later
does not repeat it.

### Legal — `/legal`, `/terms`, `/privacy`

One page, two halves, and public on purpose: a policy you have to sign up to read is not a policy.
A full-bleed hero over `L1.png` with a scrim dark enough for white text at AA, the headline *The
short, honest version*, a "Last updated 27 August 2026" line driven by `legalUpdatedAt`, and two
pills that jump to either half.

Part one is eight numbered Terms clauses; part two is eight Privacy clauses with the image on the
left instead of the right, so the halves do not mirror each other. Between the Privacy intro and its
clauses sits the creative beat: two equal-weight columns, **What is stored** on a warm brand card
against **What is never stored** on a plain one. It is the fastest honest answer to "what do you keep
about me?" — and the reason it can be trusted is that every line was read off the backend's own
models. The headline of that block: *the photo you upload is never saved — only the artwork that
comes back is.*

All three paths open at the top. Clicking the pill for the half you are already on does not change
`pathname`, so the click handler scrolls directly — the same mechanism the footer links use.

Copy lives in [`data/legalData.js`](src/data/legalData.js), beside `homeData.js`, so `LegalPage.jsx`
stays layout. That separation exists so a claim that stops being true is findable: if the backend
changes, the sentence to fix is in the data file, not buried in JSX.

### Not found — `*`

A real 404 card: the number, *Page not found*, and two actions. The first is always Home; the second
changes with sign-in state — **Go to Create** when authenticated, **Sign in** when not. This is why
`App.jsx` lists `/home`, `/features`, `/gallery` and `/faq` explicitly: they only ever reached
`HomePage` through the catch-all, so narrowing `*` to a 404 without naming them would have turned the
entire nav into "page not found".

## Features that are not visible until they matter

Everything above is what you can see. This section is the part that only shows itself when the
network misbehaves, the token expires, or the browser refuses to cooperate.

### Bearer-protected images cannot go in an `<img src>`

`GET /api/v1/generations/{id}/image` requires `Authorization: Bearer …`, and the browser's image
loader sends no such header — so `<img src={imageUrl}>` would answer 401 for every card in the grid.

[`GenerationCard.jsx`](src/components/GenerationCard.jsx) fetches the bytes with `fetch`, wraps the
blob in `URL.createObjectURL`, and revokes it on unmount. Three details in that effect are
deliberate:

- The object URL is created **inside** the effect, never in render, so no leak survives a re-render.
- The `cancelled` flag is checked **before** `createObjectURL`, not after — creating a URL for a card
  that has already unmounted allocates something nothing will ever revoke.
- The card aborts its own in-flight fetch on unmount, which matters when you page through history
  quickly.

A 404 on the image fetch renders "This image is no longer available." rather than a broken-image
icon, and Download reuses the blob URL that is already on screen instead of fetching the bytes twice.

### Seven upstream failures, seven different sentences

Both create sections used to print one line for every possible cause:

```
Network response was not ok. Status: 502. Message: Generation failed
```

That was honestly all the backend told them. It now attaches a stable `code` to its
`application/problem+json` body, and [`utils/generationErrors.js`](src/utils/generationErrors.js)
is the single place those codes become copy — keyed on `code`, never on the `detail` text, which
would break the moment someone rewords a sentence upstream.

| Backend `code` | What the notice says | Tone | Retry offered |
| --- | --- | --- | --- |
| `stability_credits_exhausted` | Out of generation credits | red | no |
| `stability_rate_limited` | Too many requests | amber | after a countdown |
| `stability_auth_failed` | Image service key rejected | red | no |
| `stability_request_rejected` | Prompt was refused | red | no |
| `stability_unavailable` | Image service unavailable | amber | yes |
| `stability_timeout` | Image service timed out | amber | yes |
| `stability_error` | Generation failed upstream | red | no |

Plus three cases with no `code` at all: a `fetch` that never got a reply becomes *Cannot reach
Ghibli AI*; an unrecognised 5xx falls back to the backend's own `detail` and is still worth one
retry; a 4xx is the caller's to fix, so no retry.

Amber versus red is not decoration. Amber means a transient upstream condition that says nothing
about what you did; red means a real decision — top up the balance, replace the key, reword the
prompt.

Two rules [`GenerationErrorNotice.jsx`](src/components/GenerationErrorNotice.jsx) keeps:

- **`retryable` comes from the backend, never from a guess.** Offering "Try again" for an empty
  balance is a lie, and only the server knows which it is.
- **A 429 disables the button for `retryAfterSeconds`**, counting down inside the label —
  `Try again in 12s` — so the button itself explains why it is disabled. A second identical 429
  restarts the countdown rather than leaving it at zero. It is the one failure where an instant
  retry is actively harmful: it extends the rate limit.

The client-side guards ("Please enter a description…", "Image is too large…") pass through the same
component as a bare sentence with no heading and no retry button. They are not API failures and must
not be dressed up as one. The notice carries `role="alert"`, so a screen reader announces the
failure instead of it only appearing visually.

### Your work survives a reload

Two `localStorage` keys, both versioned so an old shape is ignored rather than mis-read:

| Key | Holds | Cleared by |
| --- | --- | --- |
| `ghbli.auth.v1` | The signed token plus `userId`, `name`, `email`, `roles` | Logout, or a 401 from any token-bearing request |
| `ghbli.draft.v1` | The most recent result per tab: the image, the prompt, the style, and which tab was last used | **Create Another**, a new upload replacing the result, or logout |

The session is restored **synchronously**, in a `useState` initialiser rather than an effect. An
effect would render one frame as a signed-out user first, which is the classic "login does not
survive F5" bug — and it is also why `ProtectedRoute` needs no third "checking" state: by the time it
renders, the answer is already known.

The draft store ([`generationDraftStore.js`](src/services/generationDraftStore.js)) is the fiddlier
of the two, for three reasons worth naming:

- **The image is stored as a base64 `data:` URL, not the `blob:` URL.** An object URL is scoped to
  the document that created it, so a persisted `blob:` string is a broken image after the next
  reload.
- **A write can legitimately fail.** An SDXL PNG is 1.5–2 MB and base64 adds a third, so one slot is
  ~2.5 MB against an origin allowance of about 5 MB — two filled slots can overflow. On failure the
  store evicts the *other* slot and retries once, then gives up and returns `false`. It never throws:
  you already have the image on screen, and a bookkeeping problem must not look like a failed
  generation.
- **Every record is stamped with its `userId`.** A record belonging to anybody else is dropped and
  deleted on read, which covers a token expiring and a second account signing in on the same browser
  with no hook into the 401 path.

The honest caveat, and the reason the Privacy page says so out loud: a token in `localStorage`
survives a refresh, but any script on this origin could read it — which is why it is never worth more
than one day.

### Requests that cannot land out of order

[`hooks/useGenerationHistory.js`](src/hooks/useGenerationHistory.js) owns the fetch, and pairs an
`AbortController` with a monotonic request id. Both are needed, and for different reasons:

- The **abort** cancels whatever is in flight, so rapid pagination clicks resolve in a defined order
  rather than by network luck.
- The **request id** is checked before any `setState`, because an abort is best-effort — a response
  already in the pipe still resolves. Without it, a slow page 0 landing after a fast page 1 would
  render page 0's rows while the pagination controls said page 1.

An abort is not reported as an error. Showing "the request was cancelled" for a page the user already
navigated away from is a bug that looks like a server problem. Two more behaviours in the same hook:
an empty page past the first walks back one page automatically (deleting the last row on the last
page, or returning to a deep page whose rows are gone), and `isLoading` / `isRefreshing` /
`isEmpty` are separate flags so a refetch under existing rows shows a quiet "Refreshing…" instead of
blanking the grid.

`GenerationCard` runs its own controller for its own image fetch. The hook holds no image bytes and
no object URLs at all, so it cannot leak one.

### A 401 anywhere bounces once, through the router

`apiClient` recognises exactly one condition — status 401 on a request that *sent* a token — and does
three things in order: latch a flag so `/login` can explain itself, clear the stored session, then
call the handler `AuthContext` registered at startup. That handler navigates with `useNavigate` and
carries `state.from` built from `window.location`.

Navigating through the router rather than assigning `window.location` keeps it a single-page
transition: no document reload, no white flash, and the redirect target survives. The 401 path and
`ProtectedRoute` deliberately produce the same `state.from` shape, which is why one
`resolveRedirect` serves both.

### Logging out in one tab logs out the rest

`authStorage.subscribe` notifies its own listeners *and* binds the browser's `storage` event, which
fires in every **other** tab on the same origin when the key changes. So logging out in one tab drops
the header menu and bounces the protected pages in the others, without polling and without a shared
worker. It is fifteen lines, and it is the difference between "logged out" and "logged out in this
tab only".

### Module-level pub/sub instead of prop drilling

[`services/generationEvents.js`](src/services/generationEvents.js) is a `Set` of listeners at module
scope, plus `subscribeToGenerations` (returns its own unsubscribe) and `notifyGenerationCreated`. The
publisher is `apiClient`, on a successful generate; the subscriber is the history hook.

The alternative was lifting history state into a common ancestor of `CreatePage` and `HistoryPage` —
a context that exists solely so one component can tell another "something changed". Each listener is
invoked in its own `try`/`catch` over a copied array, so one throwing subscriber cannot stop the
others and unsubscribing during notification cannot corrupt the iteration.

This is safe against a race only because of how the backend orders its writes: the history row is
committed **before** the PNG reaches the browser, so by the time this event fires the row is already
queryable. `RecentGenerations` refreshes on it; the history grid subscribes **only while sitting on
page 0**, since prepending a new row to page 3 would be a lie.

### One shared vocabulary for labels

[`utils/generationLabels.js`](src/utils/generationLabels.js) holds every user-facing string that
describes a generation, so the Create result, the history card and the gallery tiles cannot disagree:

- `typeLabel` — `PHOTO_TO_IMAGE` → "Photo to Art", `TEXT_TO_IMAGE` → "Text to Art".
- `styleLabel` — resolves a style **only for `TEXT_TO_IMAGE`**. Photo rows carry the `anime` preset
  the backend hardcodes for that flow, so mapping them would print "My Neighbor Totoro" under a photo
  the user never labelled. Returning nothing is correct; the card just omits the segment.
- `formatBytes` — checks for `null`/`undefined` explicitly rather than truthiness, so a legitimate
  `0` renders as `0 B` instead of disappearing.
- `downloadFilename` — builds the saved name in the browser. The bytes arrive as `image/png` with a
  `Content-Disposition` the browser will not expose: it is not on the CORS-safelist, so reading it
  cross-origin would need the backend to add `Access-Control-Expose-Headers`. Naming the file client
  side is one line and needs nothing from the server.

## Design system

Tailwind with a small, deliberate token set — [`tailwind.config.js`](tailwind.config.js) plus a
handful of component classes in [`src/index.css`](src/index.css). Nothing is themed at runtime; there
is no dark mode.

| Token | Value | Used for |
| --- | --- | --- |
| `brand-50` … `brand-900` | `#ecfdf5` `#d1fae5` `#0f766e` `#0b5f59` `#084d49` `#06403d` `#032a29` | Every primary surface, border and button. The scale is deliberately sparse — 50/100 then 500–900, no 200–400 |
| `accent-100 / 300 / 500` | `#fff7e6` `#ffe0a8` `#ffbe55` | The warm counterweight: badges, quote marks, hover glows |
| `shadow-card` | `0 12px 30px rgba(15,23,42,0.08)` | Every card and panel; slate-tinted, not black |
| `shadow-glow` | `0 18px 40px rgba(15,118,110,0.25)` | Primary buttons and the featured image — brand-tinted, so it reads as light rather than shadow |
| `font-heading` | Sora | Headings only; body copy is Manrope |

<!--APPEND-->








