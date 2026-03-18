package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.EnsembleAnalysisDoc;
import edu.stonybrook.cse416.backend.repository.EnsembleAnalysisRepository;
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

    private final EnsembleAnalysisRepository ensembleRepo;

    public EnsembleService(EnsembleAnalysisRepository ensembleRepo) {
        this.ensembleRepo = ensembleRepo;
    }

    /**
     * Returns only the ensemble splits payload for the given state, or
     * {@code null} if no data exists.
     */
    @Cacheable(value = "ensembleSplits", key = "#stateId")
    public Map<String, Object> getSplits(String stateId) {
        Optional<EnsembleAnalysisDoc> opt = ensembleRepo.findById(stateId);
        if (opt.isEmpty()) return null;
        return opt.get().getSplits();
    }

    /**
     * Returns only the box-whisker payload for the given state, or
     * {@code null} if no data exists.
     */
    @Cacheable(value = "ensembleBoxWhisker", key = "#stateId")
    public Map<String, Object> getBoxWhisker(String stateId) {
        Optional<EnsembleAnalysisDoc> opt = ensembleRepo.findById(stateId);
        if (opt.isEmpty()) return null;
        return opt.get().getBoxWhisker();
    }
}
