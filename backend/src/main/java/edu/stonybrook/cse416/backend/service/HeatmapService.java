package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.HeatmapDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.repository.HeatmapRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * HeatmapService — serves {@code GET /api/states/{stateId}/heatmap?race=}.
 *
 * <p>Documents are stored one-per-race so payloads stay small even for large
 * real-world datasets with tens of thousands of precincts.
 * Cached under {@code "heatmaps"} keyed by (stateId, race), so switching back
 * to a previously viewed race is instant.
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
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @param race    lowercase racial group key (e.g. "black")
     */
    @Cacheable(value = "heatmaps", key = "#stateId + '_' + #race")
    public HeatmapDoc getHeatmap(State stateId, String race) {
        Optional<HeatmapDoc> opt = heatmapRepo.findByStateIdAndRace(
                stateId, race.toLowerCase());
        return opt.orElse(null);
    }
}
