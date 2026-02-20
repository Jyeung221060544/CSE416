import { useNavigate, useLocation } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function Navbar() {

    const navigate = useNavigate()
    const location = useLocation()

    const {
        selectedState,
        resetFilters,
        setSelectedState,
    } = useAppStore()

    const isStatePage = location.pathname.startsWith('/state/')
    const isHomePage = location.pathname === '/'
    const iconSize = "[&_svg]:!w-6 [&_svg]:!h-6"

    const handleHome = () => {
        resetFilters()
        setSelectedState(null)
        navigate('/')
    }

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        {/* Title */}
        <div className="flex items-center gap-3">
            <span className="text-black font-semibold text-lg tracking-wide">
                VRA Redistricting Tool
            </span>
            {isStatePage && selectedState && (
                <>
                <Separator orientation="vertical" className="h-5 bg-gray-300" />
                <Badge variant="outline" className="text-teal-700 border-teal-400 bg-teal-50 font-medium">
                    {selectedState}
                </Badge>
                </>
            )}
        </div>

        {/* Course Label & Home */}
        <div className="flex items-center gap-4">
            {/* Course Label */}
            <span className="text-black text-sm font-medium tracking-widest uppercase hidden sm:block">
                CSE416 · Cubs
            </span>
            <Separator orientation="vertical" className="h-5 bg-gray-200 hidden sm:block" />

            {/* Home Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleHome}
                disabled={isHomePage}
                className={`
                    flex items-center gap-1
                    ${isHomePage
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'bg-teal-500 text-black hover:bg-black hover:text-white shadow-sm'
                    }
                    ${iconSize}
                `}
            >
                <Home />
                <span className="hidden sm:inline">Home</span>
            </Button>
      </div>
    </nav>
  )
}
