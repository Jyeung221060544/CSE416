# CSE416 UI Review Preparation Guide
## Team — Spring 2026 | Review Date: 3/x/26

---

## PART 1: PRESENTATION LOGISTICS (Oral Presentation Rubric)

### 1. Quick Setup
- Open browser to `http://localhost:5173` BEFORE the review starts
- Have `npm run dev` running in backend and frontend terminals
- Pre-navigate to the Alabama state page (the only fully-populated state)
- Open a second tab on the Home page (US map) for clean demo flow
- Designate one machine as the demo machine — test it loads in <5 seconds

### 2. Separate Presenter / Driver
- **DRIVER:** Handles mouse, keyboard, scrolling, and clicking UI elements
- **PRESENTER:** Talks through every action the driver takes — narrates motivation and design decisions
- Never let the presenter touch the keyboard during the demo
- Agree on hand signals for "next section" and "go back"

### 3. Suggested Demo Script & Time Allocation (~15 minutes total)
| Time | Section | Who talks |
|------|---------|-----------|
| 0:00–1:00 | Intro: project goal (redistricting analysis) | Presenter A |
| 1:00–3:00 | Home page: USMap, state selection | Presenter A |
| 3:00–5:00 | State Overview + Congressional Table + District Map | Presenter B |
| 5:00–7:00 | Demographic Section: heatmap + population table + filters | Presenter A |
| 7:00–10:00 | Racial Polarization: Gingles scatter + EI charts | Presenter B |
| 10:00–12:00 | Ensemble Analysis: splits bar + box-whisker | Presenter A |
| 12:00–13:30 | Cross-component interactions (click map → highlight table) | Driver |
| 13:30–15:00 | Q&A buffer / wrap up | Both |

### 4. Handling Questions
Prepare answers for likely questions (see Part 5 below).

---

## PART 2: PROJECT CONTENT — TALKING POINTS PER RUBRIC ITEM

### 1. Demonstrated Understanding of Project Goals
**What to say:**
> "Our project is a redistricting analysis tool for congressional districts. It allows political analysts to evaluate whether district maps are gerrymandered or violate Voting Rights Act (VRA) requirements. We support three types of analysis:
> 1. **Demographic analysis** — how populations are distributed by race
> 2. **Racial polarization analysis** — using the Gingles preconditions and Ecological Inference to detect racially polarized voting
> 3. **Ensemble analysis** — comparing the enacted plan against thousands of computer-generated redistricting plans to detect outliers"

**Currently supported states:** Alabama (full data), Oregon (partial — state overview only)

---

### 2. Exhibited Analysis in Structure of GUI
**Design motivations to explain:**
- **Single-page app with scroll-based navigation** — long-form data analysis works naturally in a scrolling layout, similar to data journalism tools (e.g., The Pudding, NYT election maps). Sidebar tracks position with IntersectionObserver.
- **Sidebar with context-sensitive filters** — filters only relevant to the current visible section appear. This avoids overwhelming users with every filter at once.
- **Zustand global state** — lightweight store enables cross-component communication (e.g., clicking a district on the map highlights the same district in the table) without prop-drilling through a deep component tree.
- **Tab-based sub-sections** (Ensemble Analysis, Racial Polarization) — groups related views; prevents information overload.
- **Dark-themed data panels + light sidebar** — dark background panels reduce eye strain for dense data tables and charts.

---

### 3. Breadth of Material Included in GUI
The GUI covers **5 distinct types of analysis content:**

| Section | Content | Data Type |
|---------|---------|-----------|
| State Overview | Population stats, party control, representatives list | Summary cards |
| Demographic | Race-coded choropleth + VAP table + feasibility badges | Spatial + tabular |
| Gingles Preconditions | Scatter plot + precinct table + summary bins | Statistical + tabular |
| Ecological Inference | KDE curves + grouped bar chart (peak support) | Statistical |
| Ensemble Analysis | Seat split distribution + box-whisker by district | Statistical |

**5 chart types, 4 table types, 3 map views** — intentionally varied to hit every rubric visualization format requirement.

---

### 4. Integration with Mapping API
**Library: Leaflet + React-Leaflet**

**Why Leaflet over alternatives:**
| Library | Why NOT chosen |
|---------|---------------|
| Google Maps | Paid API key; requires credit card; ToS restrictions on political data |
| MapBox | Paid tier; complex token management; heavier bundle |
| ArcGIS JS | Enterprise-focused; massive SDK; overkill for our scale |
| **Leaflet** | **Open source, MIT license, 42KB gzipped, React-Leaflet wrapper for declarative use** |

**3 Distinct Leaflet Integrations:**

#### A. `USMap.jsx` — National Splash Map
- **Component:** `MapContainer` + `GeoJSON` layer (US-48-States.geojson)
- **Interaction:** `onEachFeature` adds hover (mouseover/mouseout) and click handlers
- **Hover:** Changes fill opacity, renders floating state profile card
- **Click:** `useNavigate('/state/:stateId')` — routes to state analysis page
- **Styling:** Brand-primary highlight (#2563EB) for available states; gray for others

#### B. `DistrictMap2024.jsx` — Congressional District Map
- **Component:** `MapContainer` + `GeoJSON` with `key` prop to force re-render on state change
- **Party coloring:** DEM_COLOR (`#3b82f6`), REP_COLOR (`#ef4444`) from `partyColors.js`
- **Cross-highlight:** Click sets `selectedDistrict` in Zustand store → `CongressionalTable` highlights matching row
- **`useMap()` hook** — used to call `fitBounds()` and re-center map when district data loads
- **GeoJSON sources:** `ALCongressionalDistricts.json`, `ORCongressionalDistrict.json`

#### C. `DemographicHeatmap.jsx` — Choropleth Heatmap
- **Component:** `MapContainer` + `GeoJSON` with dynamic style function
- **Two granularities:** Precinct (`ALPrecinctMap.json`, 1947 features) and Census Block (`ALBlockMap.json`)
- **Color bins:** Assigned by backend; each GeoJSON feature has a `color` property (5-bin sequential scale)
- **Filter-reactive:** Re-renders when `raceFilter` or `granularityFilter` changes in Zustand
- **ResizeObserver:** Detects sidebar width change → calls `map.invalidateSize()` to prevent gray tiles
- **CartoDB basemap:** `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` — clean, label-light basemap appropriate for choropleth overlays

---

### 5. Showed a Variety of Visualization Formats

We use **5 distinct chart types** across **2 libraries + custom SVG**:

#### A. Scatter Plot — `GinglesScatterPlot.jsx`
- **Library:** `@nivo/scatterplot` (`ResponsiveScatterPlot`)
- **What it shows:** Each precinct as a dot (x = minority VAP%, y = Dem vote share). Used to test Gingles Precondition 1 (minority group is large enough) and Precondition 2 (racially polarized voting).
- **Custom layers:** D3-generated trendline (`d3.line` + `d3.curveMonotoneX`) overlaid as SVG path
- **Threshold line:** Horizontal 50% line showing majority threshold
- **Cross-highlight:** Hovering a dot highlights the row in GinglesPrecinctTable via Zustand `selectedId`
- **Why Nivo over D3 directly:** Nivo provides responsive containers, automatic scales, and animation out-of-the-box; we use raw D3 only for the trendline geometry which Nivo cannot do natively

#### B. Line / KDE Chart — `EIKDEChart.jsx`
- **Library:** `@nivo/line` (`ResponsiveLine`)
- **What it shows:** Kernel Density Estimation curves of Democratic vote support likelihood per racial group. Multi-line, one per race.
- **Custom layer:** Confidence interval bands rendered as SVG `<path>` polygons with opacity, with dashed boundary lines
- **Slice tooltip:** Nivo's `enableSliceTooltip` shows all races at the same x-position simultaneously
- **Filter:** `eiRaceFilter` from Zustand controls which racial groups are shown (multi-select checkboxes)

#### C. Bar Chart (Grouped) — `EIBarChart.jsx`
- **Library:** `@nivo/bar` (`ResponsiveBar`)
- **What it shows:** Peak probability of Democratic vote support per racial group, with 95% confidence intervals
- **Custom layer:** CI error brackets rendered in a custom SVG layer on top of Nivo bars
- **50% threshold:** Horizontal reference line custom layer
- **Why grouped bars:** Allows direct comparison of Dem vs Rep peak support for each racial group side-by-side

#### D. Bar Chart (Frequency Distribution) — `EnsembleSplitChart.jsx`
- **Library:** `@nivo/bar` (`ResponsiveBar`)
- **What it shows:** How many ensemble plans produce each Republican-Democratic seat split (e.g., 4R-3D vs 5R-2D)
- **Enacted plan highlight:** Custom layer renders amber (`#f59e0b`) fill over the enacted plan's column
- **Party coloring:** Majority party determines bar color — blue if Dems hold majority, red if Republicans

#### E. Box & Whisker — `BoxWhiskerChart.jsx`
- **Library:** Custom SVG (no Nivo — Nivo has no box-whisker)
- **D3 usage:** `d3.scaleBand()` for x-axis (districts), `d3.scaleLinear()` for y-axis (Dem vote share)
- **What it shows:** For each congressional district, the distribution of Dem vote share across all ensemble plans (Q1, median, Q3, whiskers, outliers)
- **Enacted plan dot:** Each district also has a colored circle for the enacted plan's actual value
- **ResizeObserver:** Container width drives SVG viewBox for true responsiveness
- **Why custom SVG over Nivo:** No box-whisker chart exists in Nivo; D3 scales give pixel-perfect control; custom SVG allows full tooltip control

---

### 6. Comprehensive Set of User Interactions

List these explicitly when presenting:

| Interaction | Where | Effect |
|------------|-------|--------|
| Hover over US state | Home page map | Shows state profile card popup |
| Click US state | Home page map | Navigates to `/state/:stateId` |
| Click district on map | DistrictMap2024 | Highlights corresponding row in CongressionalTable |
| Click district row in table | CongressionalTable | Highlights district on DistrictMap2024 |
| Hover precinct dot | GinglesScatterPlot | Shows tooltip + highlights row in GinglesPrecinctTable |
| Click precinct row | GinglesPrecinctTable | Scrolls scatter plot to highlight that precinct dot |
| Select race in RaceFilter | Sidebar | Updates DemographicHeatmap + DemographicPopulationTable |
| Toggle granularity | Sidebar | Switches heatmap between precinct and census block |
| Select feasible race | Sidebar | Changes dataset in GinglesScatterPlot |
| Toggle EI race checkboxes | Sidebar | Shows/hides KDE curves in EIKDEChart |
| Collapse sidebar | Layout | Heatmap calls `map.invalidateSize()` to refit |
| Switch tabs | EnsembleAnalysis / RacialPolarization | Shows different chart |
| Dark mode toggle | Navbar | Toggles dark/light theme globally |
| Reset Filters button | Sidebar bottom | Resets all Zustand filter state to defaults |
| Scroll down page | StatePage | Sidebar active section indicator updates via IntersectionObserver |

---

### 7. Map Display of Project Data
Emphasize that all maps show **real project data** (Alabama GeoJSON from actual shapefiles):
- **ALPrecinctMap.json** — 1,947 Alabama voting precincts with GeoJSON geometry
- **ALCongressionalDistricts.json** — 7 AL congressional districts (current enacted plan)
- **ALBlockMap.json** — Census block geometry for NW Alabama sample
- **US-48-States.geojson** — Contiguous US for splash screen

The heatmap color-codes each precinct/block by the selected racial group's VAP concentration — this is **real demographic analysis**, not placeholder styling.

---

### 8. Readable Visual Appearance

**Color system (explain `partyColors.js`):**
- Democratic: `#3b82f6` (Tailwind blue-500) — universally recognized
- Republican: `#ef4444` (Tailwind red-500) — universally recognized
- Enacted plan: `#f59e0b` (amber) — distinctive from party colors; used in BoxWhisker + EnsembleSplit
- Racial groups: Distinct palette from `RACE_COLORS` — avoids red/blue to prevent confusion with party colors

**Typography:**
- Tailwind utility classes for consistent font sizing
- Section headers use `SectionHeader` component for uniform weight/size
- Table headers use `TABLE_HEADER` from `tableStyles.js`

**Layout:**
- Dark surface panels (`surface-panel`) for dense data — reduces glare on large tables
- Light sidebar on left for navigation controls
- CartoDB light basemap specifically chosen for choropleth legibility (minimal labels, no background noise)

---

## PART 3: LIBRARY-USE MOTIVATION CHEAT SHEET

### Why Nivo?
- **vs D3 directly:** Nivo wraps D3 internals in React components; no manual `useEffect` + `d3.select(svgRef)` boilerplate. Responsive containers handle resize automatically. Animation included.
- **vs Recharts:** Nivo has better support for custom layers (we heavily use custom SVG overlays). Nivo's API is more composable.
- **vs Chart.js:** Chart.js is Canvas-based; we need SVG for custom overlays and text-based tooltips. Nivo is SVG/React-native.
- **vs Plotly:** Plotly is very heavy (~3MB); has a Python-oriented API. Nivo is React-first and tree-shakeable.

### Why D3 (alongside Nivo)?
- Used for `BoxWhiskerChart` (Nivo has no box-whisker component)
- Used for trendline computation in `GinglesScatterPlot` (Nivo ScatterPlot cannot draw regression lines)
- D3's scales (`scaleBand`, `scaleLinear`) are the gold standard for data-to-pixel mapping

### Why Leaflet?
- Free, open-source, MIT license — no API key, no billing risk
- React-Leaflet v5 gives declarative component API (`<MapContainer>`, `<GeoJSON>`, `<TileLayer>`)
- Huge GeoJSON rendering performance for our precinct count (~2K features)
- Supports `onEachFeature`, `style`, and event handlers natively

### Why Zustand?
- **vs Redux:** No boilerplate (actions, reducers, selectors). For our scale (< 15 state properties), Zustand is appropriate. Redux would add unnecessary complexity.
- **vs React Context:** Context re-renders all consumers on any state change. Zustand allows granular subscriptions — only components that `select` a piece of state re-render.
- **vs useState + prop drilling:** State is shared across sibling components (map ↔ table cross-highlight). Prop-drilling 4 levels deep is unmaintainable.

### Why React Router v7?
- URL-based state: `/state/AL`, `/state/OR` — deep-linkable, browser-back works
- `useParams()` extracts `:stateId` for data fetching
- Nested routes allow persistent layout (Navbar, Sidebar) with swappable page content (`<Outlet>`)

### Why Tailwind CSS?
- Utility-first: no context switching between CSS files and JSX
- Consistent spacing/color tokens across all components
- Works perfectly with Shadcn/UI component library

### Why Shadcn/UI?
- Components (Badge, Button, Card) are copied into the project — fully customizable, no runtime dependency
- Radix UI primitives underneath for accessibility
- Tailwind-native styling

---

## PART 4: LIKELY Q&A AND ANSWERS

**Q: What happens when the backend is not running?**
A: Currently the app runs entirely on dummy data (JSON files in `/src/dummy/`). The `api.jsx` service file is a placeholder — the frontend is architected for easy swap to real API calls via `useStateData.js`.

**Q: Why is only Alabama fully populated?**
A: Alabama is our primary test state because the 2023 _Allen v. Milligan_ Supreme Court case (Voting Rights Act violation) provides a real-world Gingles analysis benchmark. Oregon has partial data for state overview.

**Q: How does the cross-highlighting between map and table work?**
A: Both `DistrictMap2024` and `CongressionalTable` subscribe to `selectedDistrict` in the Zustand store. When the map receives a click event, it calls `setSelectedDistrict(districtId)`. The table detects the change and applies a highlighted row style to the matching district. This is pure frontend state — no API call needed.

**Q: Why custom SVG for the box-whisker instead of a library?**
A: No production React charting library (Nivo, Recharts, Chart.js, Plotly) offers a box-whisker component that supports our specific requirements: custom enacted plan dots, crosshair-linked tooltips, and responsive layout. D3 scales give us pixel-precise control.

**Q: What is Ecological Inference and why does it need two charts?**
A: EI is a statistical method (Gary King's EI model) that estimates voting behavior by racial group from aggregate precinct data. The **KDE chart** shows the full probability distribution of support for each group. The **bar chart** summarizes the peak (modal) support estimate with confidence intervals. Two charts capture different aspects: the full distribution vs. the point estimate.

**Q: What is the Ensemble Analysis showing?**
A: We generated thousands of redistricting plans using a Markov Chain Monte Carlo (MCMC) algorithm (ReCom). The ensemble represents the universe of "reasonable" maps. We compare the enacted plan against this ensemble — if the enacted plan is an extreme outlier (e.g., far fewer majority-minority districts than the ensemble average), it suggests intentional gerrymandering.

**Q: How do the filters work?**
A: All filter values live in the Zustand global store (`raceFilter`, `granularityFilter`, `feasibleRaceFilter`, `eiRaceFilter`). Filter components call store setters. Chart/map components subscribe to the relevant filter value and re-render when it changes. The `FilterPanel` in the sidebar uses `activeSection` from the store to show only contextually relevant filters.

**Q: Why did you use IntersectionObserver for section tracking?**
A: The StatePage is a long scrolling page with 4 major sections. IntersectionObserver fires when a section enters/exits the viewport, giving us the currently visible section without polling. This updates `activeSection` in Zustand, which the sidebar uses to highlight the current section and show the right filter panel.

---

## PART 5: COMPONENT → LIBRARY QUICK REFERENCE TABLE

| Component | Primary Library | D3 Usage | Zustand State Used |
|-----------|----------------|----------|-------------------|
| USMap | Leaflet, React-Leaflet | No | selectedState |
| DistrictMap2024 | Leaflet, React-Leaflet | No | selectedDistrict |
| DemographicHeatmap | Leaflet, React-Leaflet | No | raceFilter, granularityFilter |
| GinglesScatterPlot | @nivo/scatterplot | Yes (trendline) | feasibleRaceFilter, selectedId |
| EIKDEChart | @nivo/line | No | eiRaceFilter |
| EIBarChart | @nivo/bar | No | (data props only) |
| EnsembleSplitChart | @nivo/bar | No | ensembleFilter |
| BoxWhiskerChart | Custom SVG | Yes (scales, axes) | selectedDistrict |
| CongressionalTable | React (no chart lib) | No | selectedDistrict |
| DemographicPopulationTable | React (no chart lib) | No | raceFilter |
| GinglesPrecinctTable | React (no chart lib) | No | selectedId (Gingles) |
| GinglesSummaryTable | React (no chart lib) | No | (data props only) |
| EnsembleSummaryTable | React (no chart lib) | No | (data props only) |

---

## PART 6: ARCHITECTURE SUMMARY (Say This Out Loud)

> "Our frontend is a React 19 single-page application built with Vite. We use React Router v7 for URL-based navigation — clicking a state takes you to `/state/AL`. Global state is managed with Zustand, which enables cross-component interactions like map-to-table highlighting without prop-drilling.
>
> For visualization we chose Nivo for standard chart types — it wraps D3 in React components with built-in responsiveness and animation. Where Nivo falls short — box-whisker plots and regression trendlines — we use D3 directly for pixel-precise SVG rendering.
>
> For mapping we use Leaflet with the React-Leaflet wrapper. It's open-source, requires no API key, and handles our GeoJSON data (1,947 Alabama precincts) efficiently.
>
> Styling is Tailwind CSS with Shadcn/UI component primitives, giving us a consistent, accessible design system without shipping a full UI framework runtime."

---

## PART 7: DEMO CHECKLIST (Day-Of)

- [ ] Backend running on correct port
- [ ] Frontend dev server running (`npm run dev`)
- [ ] Browser open to Home page
- [ ] Alabama data loads correctly (check network tab briefly)
- [ ] Both presenter roles assigned with clear transition points
- [ ] Filters demo'd: change race, change granularity, reset filters
- [ ] Cross-highlight demo'd: click map district → table highlights
- [ ] Gingles cross-highlight demo'd: hover dot → table row highlights
- [ ] Tab switching demo'd (Ensemble tabs, RP tabs)
- [ ] Dark mode toggle shown
- [ ] Sidebar collapse + heatmap resize shown (optional, if time)
- [ ] Q&A answers rehearsed by both presenters

---

*Generated: 2026-03-02 | CSE416 Spring 2026*
