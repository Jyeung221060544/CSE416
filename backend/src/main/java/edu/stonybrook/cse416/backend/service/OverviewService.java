package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.StateOverviewDoc;
import edu.stonybrook.cse416.backend.repository.StateOverviewRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * OverviewService — serves the {@code GET /api/states/{stateId}/overview} endpoint.
 *
 * <p>Returns the three small payloads needed on state-page load: stateSummary,
 * districtSummary, and ensembleSummary (~3 KB combined).
 *
 * <p>Cached under {@code "state_overview"} keyed by {@code stateId}.
 */
@Service
public class OverviewService {

    private final StateOverviewRepository overviewRepo;

    public OverviewService(StateOverviewRepository overviewRepo) {
        this.overviewRepo = overviewRepo;
    }

    /**
     * Returns the overview bundle for the given state, or {@code null} if unknown.
     *
     * <p>Response shape:
     * <pre>{
     *   stateSummary, districtSummary, ensembleSummary,
     *   availableHeatmapRaces:    ["black", "white", ...],
     *   availableEiComparePairs:  [["black","white"], ...]
     * }</pre>
     *
     * <p>The two {@code available*} fields are manifests discovered at seed time
     * from the actual data — never hardcoded.  The frontend uses them to:
     * <ul>
     *   <li>Know which {@code race} values to pass to {@code GET /heatmap}</li>
     *   <li>Enable only valid pair options in {@code Select2RaceFilter}</li>
     * </ul>
     */
    @Cacheable(value = "state_overview", key = "#stateId")
    public Map<String, Object> getOverview(String stateId) {
        Optional<StateOverviewDoc> opt = overviewRepo.findById(stateId);
        if (opt.isEmpty()) return null;

        StateOverviewDoc doc = opt.get();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("stateSummary",           doc.getStateSummary());
        response.put("districtSummary",         doc.getDistrictSummary());
        response.put("ensembleSummary",         doc.getEnsembleSummary());
        response.put("availableHeatmapRaces",   doc.getAvailableHeatmapRaces());
        response.put("availableEiComparePairs", doc.getAvailableEiComparePairs());
        return response;
    }
}
