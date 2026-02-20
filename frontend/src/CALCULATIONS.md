**STATE-SUMMARY Calculations**
- `votingAgePopulation` — from Census VAP data for the state (use consistently throughout app per the professor's guidance)
- `vapPercentage` = `group_vap / total_vap` — use VAP, not total population, for all demographic percentages
- `democraticVoteShare` = `dem_votes / (dem_votes + rep_votes)` from 2024 Presidential precinct data, summed statewide
- `isFeasible` = `group_vap >= 400000` (the feasibility threshold from the use case spec)
- `idealDistrictPopulation` = `totalPopulation / numDistricts`


### Flow Summary
```
Splash page loads
  → GET /api/states  (lightweight state list)
  → Leaflet renders US GeoJSON, thickens borders where hasData=true

User clicks state → router.push(/state/NY)
  → GET /api/states/OR/summary            (GUI-3 panel)
  → GET /api/states/OR/ensembles          (GUI-1 table)
  → GET /api/states/OR/districts/geojson  (GUI-2 map, enacted plan)
```

**DISTRICT CONGRESSIONAL REPRESENTATION Calculations:**

- `voteMarginPercentage` = `winner_votes - loser_votes / total_votes_in_district` — sum all precinct votes within the district boundary from 2024 Presidential data
- `voteMarginDirection` = `"D"` if dem won, `"R"` if rep won — drives color coding in the table (red/blue)
- `racialGroup` — the representative's self-identified racial/ethnic group, sourced from congressional records (hardcoded, not calculated)
- `representative` and `party` — enacted plan only, hardcoded from current congressional data

---

### Flow
```
User lands on /state/AL
  → map shows enacted district plan (GeoJSON)
  → right panel shows state summary + ensemble table (GUI-3, GUI-1)

User clicks a district on map OR clicks a row in future table
  → GET /api/states/AL/districts
  → right panel SWAPS to congressional district table
  → that district's polygon gets highlighted on map (thicker border / different color)
  → "Back to Summary" button re-renders GUI-3 panel, clears highlight

User clicks a different district on the map
  → map highlight moves to that district (no new API call, data already loaded)
```


# GUI-4 / GUI-5 — Demographic Heat Map: Server vs Frontend Calculations

## Server-Side (Pre-calculated, stored in DB or computed on request)

### 1. `groupVapPercentage` per precinct/census block
```
groupVapPercentage = group_vap / total_vap
```
- Source: Census P4/P5 tables (redistricting data)
- For census blocks: directly from Census data
- For precincts: sum all contained census block VAPs, then divide
- Computed once during preprocessing (Prepro-1), stored in DB

### 2. `democraticVoteShare` / `republicanVoteShare` per precinct/census block
```
democraticVoteShare = dem_votes / (dem_votes + rep_votes)
republicanVoteShare = rep_votes / (dem_votes + rep_votes)
```
- Source: 2024 Presidential election results by precinct
- For census blocks: disaggregated from precinct-level results
  using population-weighted interpolation if needed
- Computed once during preprocessing (Prepro-7), stored in DB

### 3. Bins (entirely server-side)
```
binWidth = 10  (equal intervals across 0–100%)

for each precinct/block:
  binId = floor(groupVapPercentage * 100 / binWidth) + 1
  edge case: groupVapPercentage = 1.0 → assign to highest bin

count per bin = number of precincts/blocks where binId matches

drop bins where count === 0  (improves color separation per spec)
```
- Bin ranges, counts, and color assignments all computed server-side
- Colors use ColorBrewer sequential Blues scale, pre-assigned per binId
- Final bins array returned already filtered (no empty bins)

---

## Frontend-Side (Computed at render time, never stored)

### 1. Color lookup
```
for each precinct/block feature in GeoJSON:
  find matching precinctId or censusBlockId in response
  look up binId → get color from bins array
  apply color to Leaflet polygon layer
```

### 2. Vote margin (only if displaying margin on hover tooltip)
```
voteMargin = democraticVoteShare - republicanVoteShare
```
- Positive = D favored, Negative = R favored
- Never stored, derived on the fly for tooltip display only

### 3. Legend rendering
```
for each bin in bins array (already filtered by server):
  render color swatch + label: "rangeMin% – rangeMax%"
  display count as secondary label if desired
```

---

## GUI-9 Gingles Scatter Plot — Server vs Frontend

### Server-Side
```
For each precinct:
  x = groupVapPercentage          (already computed above, reused)
  demY = democraticVoteShare      (already computed above, reused)
  repY = republicanVoteShare      (already computed above, reused)

regression curves (non-linear, Prepro-8):
  fit separate curves for dem points and rep points
  store regression coefficients, not point-by-point values
```
- No new data needed — reuses precinct demographic + vote share data
- Regression coefficients computed once in preprocessing (Prepro-8)
- Stored in DB per state per demographic group

### Frontend-Side
```
for each precinct:
  plot blue dot at  (groupVapPercentage, democraticVoteShare)
  plot red dot at   (groupVapPercentage, republicanVoteShare)

for regression curves:
  generate x values across 0.0 → 1.0 at small intervals (e.g. 0.01)
  compute y = f(x) using stored coefficients
  draw smooth curve through computed points
```

---

## Flow
```
User navigates to /state/AL → Demographics tab

HEAT MAP FLOW:
──────────────
User selects group from dropdown (e.g. "Black")
User selects granularity toggle (Precinct | Census Block)
  │
  ▼
GET /api/states/AL/demographics/precincts?group=Black
  or
GET /api/states/AL/demographics/census-blocks?group=Black
  │
  ▼
Server queries DB for all precincts/blocks in state
  → returns groupVapPercentage, voteShares, binId per feature
  → returns pre-filtered bins array (empty bins already dropped)
  │
  ▼
Frontend receives response
  → loads GeoJSON boundary file (already cached from state page load)
  → joins response data to GeoJSON features by precinctId/censusBlockId
  → applies bin color to each polygon
  → renders legend from bins array
  → hover tooltip shows: precinct name, group%, dem%, rep%, margin

GINGLES SCATTER PLOT FLOW (GUI-9):
───────────────────────────────────
User navigates to Gingles Analysis tab
User selects demographic group from dropdown
  │
  ▼
GET /api/states/AL/gingles?group=Black
  │
  ▼
Server returns:
  → all precincts with (groupVapPercentage, demVoteShare, repVoteShare)
  → regression coefficients for dem curve and rep curve
  │
  ▼
Frontend:
  → plots blue dot per precinct at (groupVap, demVoteShare)
  → plots red dot per precinct at  (groupVap, repVoteShare)
  → generates regression curve points from coefficients
  → draws two smooth non-linear curves (blue=D, red=R)
  → x-axis label: "% Black VAP"
  → y-axis label: "Vote Share"

NOTE: Gingles reuses the same precinct data already fetched
for the heat map — consider caching it client-side to avoid
a redundant API call if both views are in the same session.
```



## GUI-12 EI — Server vs Frontend Calculations

### Server-Side (PyEI, run once during preprocessing)

#### What PyEI does internally:
For each precinct i, PyEI observes:
  - Xi  = fraction of VAP that is Black (from Census)
  - Ti  = total vote share for candidate (from election results)
  - Ni  = total VAP in precinct

It uses the accounting identity:
  Ti = Xi * β_black_i + (1 - Xi) * β_white_i

Where:
  β_black_i = unknown fraction of Black voters supporting candidate
  β_white_i = unknown fraction of White voters supporting candidate

PyEI runs MCMC sampling to produce a posterior distribution
for β_black and β_white across all precincts, then fits a KDE
curve to the posterior samples.

#### What your server stores (pre-computed):
  peakSupportEstimate  = x value at peak of KDE curve
                       = argmax of posterior distribution
                       = most likely support level for that group

  confidenceIntervalLow/High = 2.5th and 97.5th percentiles
                               of posterior MCMC samples

  kdePoints = array of (x, y) pairs across x: 0.0 → 1.0
              at intervals of 0.05
              y = probability density at each x
              generated by KDE smoothing over MCMC samples
              stored in DB after PyEI run, never recomputed

### Frontend-Side (render time only)

  - Plot kdePoints as a filled area chart per racial group
  - Each candidate gets a separate chart (per spec: "separate chart")
  - x-axis: 0 → 1 (vote share for that candidate)
  - y-axis: probability density
  - Shade area under curve
  - Mark peakSupportEstimate with a vertical dashed line
  - Draw horizontal bracket at y=small value between
    confidenceIntervalLow and confidenceIntervalHigh
  - Color per group (e.g. Black = purple, White = gray)

  partyOfChoice (used in GUI-1 summary) derived on frontend:
    partyOfChoice = party of candidate whose
                    peakSupportEstimate is highest for that group
    e.g. Black voters peak at 0.91 for Harris → partyOfChoice = Democratic
```

---

## Flow
```
User navigates to /state/AL → EI Analysis tab

Dropdown shows feasible groups only (Black for AL)
User selects group (e.g. "Black")
  │
  ▼
GET /api/states/AL/ei?group=Black
  │
  ▼
Server returns both candidates with kdePoints
already computed from PyEI MCMC run
  │
  ▼
Frontend renders ONE chart per candidate (2 charts for AL):
  Chart 1: Harris — Black curve peaks at 0.91, White peaks at 0.27
  Chart 2: Trump  — Black curve peaks at 0.09, White peaks at 0.73

Each chart has both racial group curves overlaid
The gap between peaks = visual evidence of racially polarized voting
Wide separation → strong polarization → VRA case strengthened



## GUI-16 Ensemble Splits — Calculations & Server vs Frontend

### Server-Side (computed from SeaWulf ensemble data)

#### Per plan (SeaWulf-8):
  For each district in a plan:
    sum precinct-level 2024 Presidential dem_votes and rep_votes
    winner = party with higher total votes in that district
  
  republicanWins = count of districts won by Republican
  democraticWins = numDistricts - republicanWins
  split label = "R{republicanWins}/D{democraticWins}"

#### Per ensemble (SeaWulf-10):
  splits = group plans by split label, count frequency per label
  
  frequency[split] = count of plans producing that exact split
  
  verify: sum of all frequencies = totalPlans (5000)

#### Union range (server computes before returning):
  minRepublican = min R wins seen across BOTH ensembles
                  where frequency > 0 in either ensemble
  maxRepublican = max R wins seen across BOTH ensembles
                  where frequency > 0 in either ensemble
  
  → tails where frequency = 0 in BOTH ensembles are dropped
  → tails where frequency = 0 in ONE but not both are kept
    (per spec: "omitted only if zero in both sets")

#### enactedPlanSplit:
  hardcoded from actual 2024 election results
  AL: 5R/2D, OR: 2R/4D

### Frontend-Side

  Render two bar charts side by side (race-blind | vra-constrained)
  Both charts use unionSplitRange for x-axis — identical range
  
  x-axis labels: "5R/2D", "6R/1D" etc — constructed from
                 republican + democratic values in each split
  y-axis: frequency (raw count out of 5000)
  
  Highlight enacted plan bar on both charts:
    match enactedPlanSplit.republican to the corresponding bar
    render with different color or border to mark enacted plan
  
  Key visual insight:
    VRA-constrained shifts distribution LEFT (more D wins)
    Race-blind skews RIGHT (more R wins)
    Gap between the two distributions = impact of VRA on outcomes
```

---

**Flow:**
```
User navigates to /state/AL → Ensemble Analysis tab

GET /api/states/AL/ensemble-splits
  │
  ▼
Two bar charts render side by side
  Left:  race-blind    (AL peaks at 5R/2D)
  Right: vra-constrained (AL peaks at 4R/3D)
  
Both share same x-axis: 3R/4D → 7R/0D
Enacted plan bar (5R/2D) highlighted on both charts
User can immediately see VRA shifts ~1 seat toward Democrats