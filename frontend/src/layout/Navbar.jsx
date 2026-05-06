
import { useNavigate, useLocation } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import logo from '@/assets/logo.png'
import { STATE_COLORS } from '../lib/partyColors'

/**
 * Navbar — Fixed-height top bar with app branding and home navigation.
 *
 * @returns {JSX.Element}
 */
export default function Navbar() {

    const navigate  = useNavigate()
    const location  = useLocation()

    const { selectedState, resetFilters, setSelectedState, setActiveSection } = useAppStore()

    const isStatePage = location.pathname.startsWith('/state/')
    const isHomePage  = location.pathname === '/'

    const iconSize = "[&_svg]:!w-6 [&_svg]:!h-6"


    const handleHome = () => {
        resetFilters()                    
        setSelectedState(null)               
        setActiveSection('state-overview')   
        navigate('/')                         
    }


    return (
        <nav className="h-14 bg-white border-b border-brand-muted/40 flex items-center justify-between px-6 shrink-0">

            <div className="flex items-center gap-3">
                <img src={logo} alt="CSE416 Cubs logo" className="h-9 w-auto object-contain mix-blend-mode-multiply" style={{ mixBlendMode: 'multiply' }} />
                <span className="text-brand-darkest font-semibold text-xl tracking-wide">
                    Voting Rights Act Redistricting
                </span>

                {isStatePage && selectedState && (
                    <>
                        <Separator orientation="vertical" className="h-5 bg-brand-muted/40" />
                        <Badge
                            variant="outline"
                            className={`font-semibold ${STATE_COLORS[selectedState]?.badge ?? 'text-brand-deep border-brand-muted bg-brand-surface'}`}
                        >
                            {selectedState}
                        </Badge>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4">

                <span className="text-black text-base font-bold tracking-widest uppercase hidden sm:block">
                    CSE416 · Cubs
                </span>
                <Separator orientation="vertical" className="h-5 bg-brand-muted/30 hidden sm:block" />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHome}
                    disabled={isHomePage}
                    className={`
                        flex items-center gap-1
                        ${isHomePage
                            ? 'text-brand-darkest cursor-not-allowed'
                            : 'bg-brand-darkest text-white hover:bg-brand-deep hover:text-white shadow-sm'
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
