# Front-End 

## Front-End Source Folder Organization

### /pages
- HomePage.jsx - Home page where user can select the state; returns here if "Return" is selected
- StatePage.jsx - Once state selection is made, this page is rendered
### /components 
- reusable UI pieces 
#### /layout

#### /charts
#### /maps
#### tables

### /hooks

### /services

### /assets


### index.html
- Empty shell, container
- Browser loads index.html --> pulls in `main.jsx` via the script tag
- 
### main.jsx
- Takes 'App' Component and renders it into the `<div id="root">`
- Sets up router

### App.jsx
- Router, traffic director
- Defines which page(component) renders at which URL
- 



## Tools Used & Reasonings

### Vite

### Tailwind CSS integrated with Vite






For this project, I have mocked up the design. The UI mockup is due in a week and we must use dummy values to populate data and show the interfact for review. I would love if you help up ideate and plan. 

Here is context: 

We will have 2 pages. One is the Splash Page (pages/HomePage.jsx) and the other is the StatePage.jsx. We discussed a persistent navbar and an outlet below that fills in either the splash page or the state page (already set up). In the use case list, when the state map is clicked, it will transition to the state page with the route being /states/:stateid. The state page will have a sidebar divided into 2 sections:
1. Local Filters
   1. Is it possible that this changes conditionally based on which section we are in (sticky sections)?
   2. We want a rest filters button to go back to default.
2. Sections in which you click and are sticky --> scrolls down for youin the main content area

The Main content area is the rest and this is where all the data lies (in one continuous vertical scroll page (no horizontal scroll))

Here are the sections 
1. State Overview
   1. 2022 District Plan (map) --> able to click on the map (district highlighted) and District Congressional Representation Details Data (table) shows up
   2. Ensemble Data (table)
   3. State Summary Data (table)
2. State Demographic Data
   1. Demographic Heatmap + Legent
      1. Filter By Precinct or Census Block
      2. Filter By Race Demographic --> ALL default @ black race
3. Racial Polarization (Based off of 2024 results, see use case list for more details)
   1. Gingles Scatter Plot Chart
      1. Filter by Race Demographic (feasible racial groups = pop>=400,000 for state) --> ALL default @ black race
      2. Future-Add-Ons
         1. Precinct by Precinct Tabular Data --> highlight in table if scatter dot selected (pagination for fixed height)
         2. Vote-Share vs Seat-Share Curve (TBD if we want this)
   2. Ecological Inference (2 charts, one for each party)
      1. Multiselect Filter by Race Demographic --> ALL default @ black race
      2. Future-Add-Ons
         1. EI Precinct Results in Bar Chart Form (1 for each party)
         2. EI Precinct Results in Choropleth Chart Form (1 for each party)
         3. EI KDE (1 for each party)
4. Ensemble Analysis
   1. Ensemble Splits (one for Race-Blind, one for VRA-constrained)
   2. Box-and-Whisker (one for Race-Blind, one for VRA-constrained)
5. Comparison of Ensembles 
   1. To Be Decided ... not needed because we only have 4 days to program this...

In the Nav Bar, we want a button on the top right to select to go back to home page (splash page), data is all reset, and for them to do a state selection.


