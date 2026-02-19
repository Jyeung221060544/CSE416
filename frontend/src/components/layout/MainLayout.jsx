import { Outlet } from 'react-router-dom'

export default function MainLayout() {

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      
      {/* Navigation Bar */}
      <nav className="h-14 bg-gray-900 border-b border-gray-700 flex items-center px-6 shrink-0">
        <span className="text-lg font-semibold tracking-wide">
          CSE416 Redistricting Tool
        </span>
      </nav>

      {/* Page Content */}
      <main className="flex-1 overflow-hidden">
        {/* See main.jsx for page content candidates*/}
        <Outlet /> 
      </main>

    </div>
  )

}