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
