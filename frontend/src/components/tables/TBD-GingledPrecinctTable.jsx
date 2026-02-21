import SurfacePanel from '@/components/ui/surface-panel'

export default function TBDGingledPrecinctTable() {
    return (
        <SurfacePanel className="h-[380px] border-brand-muted/25 bg-white">
            <div className="h-full flex flex-col items-center justify-center px-8 text-center">
                <p className="text-brand-darkest font-semibold">Precinct Detail Table</p>
                <p className="text-brand-muted/60 text-sm mt-2">
                    Reserved space for point-selected precinct rows (future add-on).
                </p>
            </div>
        </SurfacePanel>
    )
}
