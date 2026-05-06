package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.EnsembleDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.repository.EnsembleRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

/**
 * EnsembleService — serves the split ensemble endpoints:
 * <ul>
 *   <li>{@code GET /api/states/{stateId}/ensemble/splits}</li>
 *   <li>{@code GET /api/states/{stateId}/ensemble/box-whisker}</li>
 * </ul>
 *
 * <p>Each method returns only the payload needed for its tab, supporting
 * lazy loading: splits data is fetched when the user enters the
 * Ensemble Splits tab; box-whisker data when they enter Box &amp; Whisker.
 */
@Service
public class EnsembleService {

    private final EnsembleRepository ensembleRepo;

    public EnsembleService(EnsembleRepository ensembleRepo) {
        this.ensembleRepo = ensembleRepo;
    }

    /**
     * Returns only the ensemble splits payload for the given state, or
     * {@code null} if no data exists.
     */
    @Cacheable(value = "ensembleSplits", key = "#stateId")
    public Map<String, Object> getSplits(State stateId) {
        Optional<EnsembleDoc> opt = ensembleRepo.findByStateId(stateId);
        if (opt.isEmpty()) return null;
        return opt.get().getSplits();
    }

    /**
     * Returns only the box-whisker payload for the given state, or
     * {@code null} if no data exists.
     */
    @Cacheable(value = "ensembleBoxWhisker", key = "#stateId")
    public Map<String, Object> getBoxWhisker(State stateId) {
        Optional<EnsembleDoc> opt = ensembleRepo.findByStateId(stateId);
        if (opt.isEmpty()) return null;
        return opt.get().getBoxWhisker();
    }

    /**
     * Returns both minority-district histogram payloads for the given state, or
     * {@code null} if no data exists.
     */
    @SuppressWarnings("unchecked")
    @Cacheable(value = "ensembleMinorityDistricts", key = "#stateId")
    public Map<String, Object> getMinorityDistricts(State stateId) {
        Optional<EnsembleDoc> opt = ensembleRepo.findByStateId(stateId);
        if (opt.isEmpty()) return null;
        EnsembleDoc doc = opt.get();

        // Derive feasibleGroups from the enactedEffectiveByGroup keys
        java.util.List<String> feasibleGroups = java.util.Collections.emptyList();
        Map<String, Object> meHist = doc.getMinorityEffectiveHistogram();
        if (meHist != null) {
            Map<String, Object> enacted = (Map<String, Object>) meHist.get("enactedEffectiveByGroup");
            if (enacted != null) feasibleGroups = new java.util.ArrayList<>(enacted.keySet());
        }

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("feasibleGroups",             feasibleGroups);
        result.put("minorityEffectiveHistogram",  meHist);
        result.put("majorityMinorityHistogram",   doc.getMajorityMinorityHistogram());
        return result;
    }
}
