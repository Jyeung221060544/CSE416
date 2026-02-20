import useAppStore from '../store/useAppStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// ── Per-section filter definitions ─────────────────────────────────
// Add new filter sets here as sections are built out
const RACE_OPTIONS = [
    { value: 'all',      label: 'All Groups' },
    { value: 'white',    label: 'White' },
    { value: 'black',    label: 'Black' },
    { value: 'hispanic', label: 'Hispanic' },
    { value: 'asian',    label: 'Asian' },
]

const GRANULARITY_OPTIONS = [
    { value: 'precinct',      label: 'Precinct' },
    { value: 'census_block',  label: 'Census Block' },
]

const ENSEMBLE_OPTIONS = [
    { value: 'race_blind', label: 'Race-Blind' },
    { value: 'vra',        label: 'VRA-Constrained' },
]

export default function FilterPanel() {
    const {
        activeSection,
        raceFilter,
        setRaceFilter,
        granularityFilter,
        setGranularityFilter,
        ensembleFilter,
        setEnsembleFilter,
        resetFilters,
    } = useAppStore()

    return (
        <div className="flex flex-col gap-3">

            {/* ── STATE OVERVIEW ─────────────────────────────── */}
            {activeSection === 'state-overview' && (
                <div className="flex flex-col gap-2">
                    <FilterLabel text="No filters available" muted />
                </div>
            )}

            {/* ── DEMOGRAPHIC ────────────────────────────────── */}
            {activeSection === 'demographic' && (
                <div className="flex flex-col gap-3">
                    <FilterGroup label="Race / Ethnicity">
                        {RACE_OPTIONS.map((opt) => (
                            <FilterPill
                                key={opt.value}
                                label={opt.label}
                                active={raceFilter === opt.value}
                                onClick={() => setRaceFilter(opt.value)}
                            />
                        ))}
                    </FilterGroup>

                    <Separator className="bg-gray-200" />

                    <FilterGroup label="Granularity">
                        {GRANULARITY_OPTIONS.map((opt) => (
                            <FilterPill
                                key={opt.value}
                                label={opt.label}
                                active={granularityFilter === opt.value}
                                onClick={() => setGranularityFilter(opt.value)}
                            />
                        ))}
                    </FilterGroup>
                </div>
            )}

            {/* ── RACIAL POLARIZATION ────────────────────────── */}
            {activeSection === 'racial-polarization' && (
                <div className="flex flex-col gap-3">
                    <FilterGroup label="Race / Ethnicity">
                        {RACE_OPTIONS.map((opt) => (
                            <FilterPill
                                key={opt.value}
                                label={opt.label}
                                active={raceFilter === opt.value}
                                onClick={() => setRaceFilter(opt.value)}
                            />
                        ))}
                    </FilterGroup>
                </div>
            )}

            {/* ── ENSEMBLE ANALYSIS ──────────────────────────── */}
            {activeSection === 'ensemble-analysis' && (
                <div className="flex flex-col gap-3">
                    <FilterGroup label="Ensemble Type">
                        {ENSEMBLE_OPTIONS.map((opt) => (
                            <FilterPill
                                key={opt.value}
                                label={opt.label}
                                active={ensembleFilter === opt.value}
                                onClick={() => setEnsembleFilter(opt.value)}
                            />
                        ))}
                    </FilterGroup>

                    <Separator className="bg-gray-200" />

                    <FilterGroup label="Race / Ethnicity">
                        {RACE_OPTIONS.map((opt) => (
                            <FilterPill
                                key={opt.value}
                                label={opt.label}
                                active={raceFilter === opt.value}
                                onClick={() => setRaceFilter(opt.value)}
                            />
                        ))}
                    </FilterGroup>
                </div>
            )}

            {/* ── Reset Button ───────────────────────────────── */}
            <Separator className="bg-gray-200 mt-1" />
            <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="w-full bg-teal-500 text-black hover:bg-black hover:text-white shadow-sm"
            >
                Reset Filters
            </Button>

        </div>
    )
}

// ── Small reusable sub-components ──────────────────────────────────

function FilterGroup({ label, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-gray-500 text-xs uppercase tracking-wider px-1">
                {label}
            </span>
            <div className="flex flex-col gap-1">
                {children}
            </div>
        </div>
    )
}

function FilterPill({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left px-3 py-1.5 rounded-full text-sm font-medium
                transition-colors duration-150
                ${active
                    ? 'bg-teal-900 text-white'
                    : 'bg-teal-500 text-black hover:bg-black hover:text-white'
                }
                shadow-sm shadow-black/10
            `}
        >
            {label}
        </button>
    )
}

function FilterLabel({ text, muted }) {
    return (
        <span className={`text-xs px-1 ${muted ? 'text-gray-400 italic' : 'text-gray-700'}`}>
            {text}
        </span>
    )
}
