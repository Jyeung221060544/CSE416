package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.StateOverviewDoc;
import edu.stonybrook.cse416.backend.repository.StateOverviewRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * OverviewService — serves the split overview endpoints:
 * <ul>
 *   <li>{@code GET /api/states/{stateId}/overview/state-stats} — fetched on
 *       state-overview section entry; contains everything needed immediately.</li>
 *   <li>{@code GET /api/states/{stateId}/overview/ensemble-demo} — fetched lazily
 *       when the user first opens the Ensemble/Pop Stats tab.</li>
 * </ul>
 */
@Service
public class OverviewService {

    private final StateOverviewRepository overviewRepo;

    public OverviewService(StateOverviewRepository overviewRepo) {
        this.overviewRepo = overviewRepo;
    }

    /**
     * Returns the state-stats bundle: everything needed immediately when the
     * state page loads (stateSummary for filter defaults + districtSummary for
     * the map party colors and seat-distribution panel).
     *
     * <p>Response shape: {@code { stateSummary, districtSummary }}
     */
    @Cacheable(value = "overview_state_stats", key = "#stateId")
    public Map<String, Object> getStateStats(String stateId) {
        Optional<StateOverviewDoc> opt = overviewRepo.findById(stateId);
        if (opt.isEmpty()) return null;

        StateOverviewDoc doc = opt.get();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("stateSummary",   doc.getStateSummary());
        response.put("districtSummary", doc.getDistrictSummary());
        return response;
    }

    /**
     * Returns the ensemble-demo bundle: fetched lazily when the user first
     * opens the Ensemble/Pop Stats tab in the State Overview section.
     *
     * <p>Response shape: {@code { ensembleSummary }}
     */
    @Cacheable(value = "overview_ensemble_demo", key = "#stateId")
    public Map<String, Object> getEnsembleDemo(String stateId) {
        Optional<StateOverviewDoc> opt = overviewRepo.findById(stateId);
        if (opt.isEmpty()) return null;

        StateOverviewDoc doc = opt.get();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ensembleSummary", doc.getEnsembleSummary());
        return response;
    }
}
