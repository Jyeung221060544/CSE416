import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Home from './pages/HomePage'
import StatePage from './pages/StatePage'
import './index.css'

/** Definition of router
 * path: '/' - route that matches the root URL
 * element: <MainLayout /> - shell that is rendered @ path
 * children: [...] - nested routes that render inside <Outlet /> in <MainLayout />
 *    - { index: true, element: <Home /> } - default child
 *    - { path: 'state/:stateId', element: <StatePage /> } - defines subpaths
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'state/:stateId', element: <StatePage /> },
    ],
  },
])

/**
 * 1. React mounts to the 'root' div
 * 2. Router takes over, defined above
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)