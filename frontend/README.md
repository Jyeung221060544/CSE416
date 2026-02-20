# Frontend

## Architecture Overview

```
main.jsx
  └── MainLayout
        ├── Navbar  (reads selectedState from store)
        └── Outlet
              ├── HomePage  (placeholder, future: USMap → navigate to /state/:id)
              └── StatePage
                    ├── useActiveSection(scrollRef) → writes activeSection to store
                    ├── Sidebar
                    │     ├── FilterPanel  (reads activeSection → shows correct filters)
                    │     │     ├── RaceFilter / EIRaceFilter / GranularityFilter / EnsembleFilter
                    │     │     └── ResetFiltersButton
                    │     └── SectionPanel (reads activeSection, clicks → scrollIntoView)
                    └── scroll container
                          ├── StateOverviewSection    id="state-overview"
                          ├── DemographicSection      id="demographic"
                          ├── RacialPolarizationSection id="racial-polarization"
                          └── EnsembleAnalysisSection  id="ensemble-analysis"
```

---

## Entry Point

**`main.jsx`**
Sets up React Router with two routes and wraps everything in `<RouterProvider>`. It's the only file that mounts to the DOM.
- `/` → renders `MainLayout` with `HomePage` as its child
- `/state/:stateId` → renders `MainLayout` with `StatePage` as its child

---

## Layout (`src/layout/`)

**`MainLayout.jsx`**
The persistent shell for every page. Renders `<Navbar>` at the top, then `<Outlet />` (where `HomePage` or `StatePage` swaps in) filling the remaining height.

**`Navbar.jsx`**
Top bar. Reads `selectedState` from the store to show a state badge when on a state page. The Home button calls `resetFilters()` + `setSelectedState(null)` + navigates to `/`.

**`Sidebar.jsx`**
Left panel on `StatePage` only. Owns a local `collapsed` boolean. Renders two sub-panels inside a scroll area:
- `FilterPanel` (hidden when collapsed)
- `SectionPanel` (shrinks to icon dots when collapsed)

**`FilterPanel.jsx`**
Reads `activeSection` from the store and conditionally renders a different set of filter components depending on which section is in view:

| Active Section | Filters Shown |
|---|---|
| `state-overview` | *(none)* |
| `demographic` | `RaceFilter` + `GranularityFilter` |
| `racial-polarization` | `RaceFilter` + `EIRaceFilter` |
| `ensemble-analysis` | `EnsembleFilter` + `RaceFilter` |

Always ends with `ResetFiltersButton`.

**`SectionPanel.jsx`**
Navigation panel listing the 4 sections. Clicking a button calls `lockScroll()` then `scrollIntoView()` on the target `<section>` element and updates `activeSection` in the store immediately (so the sidebar highlight doesn't lag behind the scroll animation).

---

## Pages (`src/pages/`)

**`HomePage.jsx`**
Placeholder — just a centered heading. Will eventually hold the US map for state selection.

**`StatePage.jsx`**
The main analysis page. Creates a `scrollRef` on the content container and calls `useActiveSection(scrollRef)` to track which section is in view. Renders `<Sidebar>` on the left and the four content sections stacked vertically on the right.

---

## Hooks (`src/hooks/`)

**`useActiveSection.js`**
Attaches a scroll listener to a given `scrollRef`. As the user scrolls, it detects direction (up vs down), uses an asymmetric trigger threshold (30% scrolling down, 50% scrolling up) to decide when to switch sections, and calls `setActiveSection` in the store. Guards against programmatic scrolls via `isScrollLocked()`.

**`useFilters.js`**
A convenience hook that pulls all filter values and setters from the store in one call. All filter components destructure only what they need from this hook instead of calling `useAppStore` directly.

**`useStateData.js`**
Stub for future API fetching. Watches `selectedState` from the store and will fire a request to `services/api.jsx` when that's implemented. Returns `{ data, loading, error }`.

---

## Store (`src/store/`)

**`useAppStore.js`**
Single Zustand store. The source of truth for all shared state:

| State | Purpose |
|---|---|
| `selectedState` | Which US state is loaded |
| `activeSection` | Which of the 4 sections is currently in view |
| `raceFilter` | Radio: All / White / Black / Hispanic / Asian |
| `granularityFilter` | Radio: Precinct / Census Block |
| `ensembleFilter` | Radio: Race-Blind / VRA-Constrained |
| `eiRaceFilter` | Multi-checkbox: races for ecological inference |
| `selectedDistrict` | Future: clicked district on the map |
| `darkMode` | Theme toggle (wired up, not yet applied to UI) |

---

## Filter Components (`src/components/filters/`)

**`CollapsibleGroup.jsx`**
Shared wrapper used by all filter components. A labeled section with a chevron toggle that shows/hides its children.

**`RaceFilter.jsx`**
Radio group for a single race selection. Used in three sections (demographic, racial-polarization, ensemble-analysis).

**`EIRaceFilter.jsx`**
Multi-checkbox for ecological inference races. Prevents deselecting the last checked item.

**`GranularityFilter.jsx`**
Radio group: Precinct vs Census Block.

**`EnsembleFilter.jsx`**
Radio group: Race-Blind vs VRA-Constrained.

**`ResetFiltersButton.jsx`**
Calls `resetFilters()` from the store, which sets all filters back to their defaults.

---

## Section Components (`src/components/sections/`)

All four are currently stubs — `min-h-screen` placeholders with their DOM `id` set. The `id` is what `useActiveSection` and `SectionPanel` use to track and scroll to them.

| File | `id` | Planned Content |
|---|---|---|
| `StateOverviewSection.jsx` | `state-overview` | District map (2022), ensemble table, state summary table |
| `DemographicSection.jsx` | `demographic` | Demographic heatmap filtered by race + granularity |
| `RacialPolarizationSection.jsx` | `racial-polarization` | Gingles scatter plot, ecological inference charts |
| `EnsembleAnalysisSection.jsx` | `ensemble-analysis` | Ensemble splits, box-and-whisker charts |

---

## Empty Scaffolding (To Be Implemented)

**`src/services/api.jsx`** — API call functions; `useStateData` will consume this once populated.

**`src/components/charts/`**
- `BoxWhiskerChart.jsx`
- `EIChart.jsx`
- `EnsembleSplitChart.jsx`
- `GinglesScatterPlot.jsx`
- `TBD-EIBarChart.jsx`
- `TBD-EIKDE.jsx`
- `TBD-VS-SS-Curve.jsx`

**`src/components/maps/`**
- `USMap.jsx`
- `DistrictMap2022.jsx`
- `DemographicHeatmap.jsx`
- `TBD-EIChoropleth.jsx`

**`src/components/tables/`**
- `CongressionalTable.jsx`
- `EnsembleSummaryTable.jsx`
- `StateSummaryTable.jsx`
- `TBD-GingledPrecinctTable.jsx`

---

## Utilities

**`src/utils/scrollLock.js`**
A plain mutable flag (not React state). `SectionPanel` calls `lockScroll()` before triggering a programmatic `scrollIntoView`, which tells `useActiveSection`'s scroll handler to ignore scroll events for ~1 second so the active section highlight doesn't flicker mid-animation.

**`src/lib/utils.js`**
`cn()` — a `clsx` + `tailwind-merge` helper used by shadcn/ui components.

---

## Tools & Libraries

| Tool | Purpose |
|---|---|
| Vite | Build tool and dev server |
| React + React Router | UI framework + client-side routing |
| Zustand | Global state management (store/) |
| Tailwind CSS | Utility-first styling |
| shadcn/ui + Radix UI | Accessible UI primitives (Button, Badge, Separator, Tooltip, ScrollArea) |
| Lucide React | Icon library |
| Leaflet | Map rendering (imported in main.jsx) |




