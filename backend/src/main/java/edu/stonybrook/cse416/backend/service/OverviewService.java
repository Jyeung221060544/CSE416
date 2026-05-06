package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.model.StateOverviewDoc;
import edu.stonybrook.cse416.backend.repository.StateOverviewRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;


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
     */
    @Cacheable(value = "overview_state_stats", key = "#stateId")
    public Map<String, Object> getStateStats(State stateId) {
        Optional<StateOverviewDoc> opt = overviewRepo.findByStateId(stateId);
        if (opt.isEmpty()) return null;

        StateOverviewDoc doc = opt.get();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("stateSummary",    doc.getStateSummary());
        response.put("districtSummary", doc.getDistrictSummary());
        response.put("ensembleSummary", doc.getEnsembleSummary());
        return response;
    }
}
