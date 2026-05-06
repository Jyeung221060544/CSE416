package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.HeatmapDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.repository.HeatmapRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * HeatmapService — serves {@code GET /api/states/{stateId}/heatmap?race=}.
 */
@Service
public class HeatmapService {

    private final HeatmapRepository heatmapRepo;

    public HeatmapService(HeatmapRepository heatmapRepo) {
        this.heatmapRepo = heatmapRepo;
    }

    /**
     * Returns the heatmap document for the given state and race,
     * or {@code null} if not found.
     *
     * @param stateId 
     * @param race    
     */
    @Cacheable(value = "heatmaps", key = "#stateId + '_' + #race")
    public HeatmapDoc getHeatmap(State stateId, String race) {
        Optional<HeatmapDoc> opt = heatmapRepo.findByStateIdAndRace(
                stateId, race.toLowerCase());
        return opt.orElse(null);
    }
}
