import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen bg-white text-black">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}