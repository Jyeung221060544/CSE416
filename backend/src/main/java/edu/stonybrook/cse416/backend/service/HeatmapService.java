package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.HeatmapDoc;
import edu.stonybrook.cse416.backend.repository.HeatmapRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * HeatmapService — serves
 * {@code GET /api/states/{stateId}/heatmap?granularity=&race=}.
 *
 * <p>Documents are stored one-per-(granularity, race) triple so payloads stay
 * small even for large real-world datasets with tens of thousands of precincts.
 * Cached under {@code "heatmaps"} keyed by the composite triple, so:
 * <ul>
 *   <li>Switching race re-fetches only the new race's document.</li>
 *   <li>Switching back to a previously viewed (granularity, race) is instant.</li>
 *   <li>The cache holds at most 5 races × 2 granularities = 10 entries per state.</li>
 * </ul>
 */
@Service
public class HeatmapService {

    private final HeatmapRepository heatmapRepo;

    public HeatmapService(HeatmapRepository heatmapRepo) {
        this.heatmapRepo = heatmapRepo;
    }

    /**
     * Returns the heatmap document for the given state, granularity, and race,
     * or {@code null} if not found.
     *
     * @param stateId     two-letter state abbreviation (e.g. "AL")
     * @param granularity "precinct" or "census_block"
     * @param race        lowercase racial group key (e.g. "black")
     */
    @Cacheable(value = "heatmaps", key = "#stateId + '_' + #granularity + '_' + #race")
    public HeatmapDoc getHeatmap(String stateId, String granularity, String race) {
        Optional<HeatmapDoc> opt = heatmapRepo.findByStateIdAndGranularityAndRace(
                stateId, granularity, race.toLowerCase());
        return opt.orElse(null);
    }
}
