package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.EnsembleAnalysisDoc;
import edu.stonybrook.cse416.backend.repository.EnsembleAnalysisRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * EnsembleService — serves the {@code GET /api/states/{stateId}/ensemble} endpoint.
 *
 * <p>Returns both ensemble-analysis payloads (splits + box-whisker) in one
 * response (~6 KB).  Cached under {@code "ensemble"} keyed by {@code stateId}.
 */
@Service
public class EnsembleService {

    private final EnsembleAnalysisRepository ensembleRepo;

    public EnsembleService(EnsembleAnalysisRepository ensembleRepo) {
        this.ensembleRepo = ensembleRepo;
    }

    /**
     * Returns the ensemble analysis bundle for the given state, or {@code null}
     * if no data exists.
     *
     * <p>Response shape:
     * <pre>{ splits: {...}, boxWhisker: {...} }</pre>
     */
    @Cacheable(value = "ensemble", key = "#stateId")
    public Map<String, Object> getEnsemble(String stateId) {
        Optional<EnsembleAnalysisDoc> opt = ensembleRepo.findById(stateId);
        if (opt.isEmpty()) return null;

        EnsembleAnalysisDoc doc = opt.get();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("splits",     doc.getSplits());
        response.put("boxWhisker", doc.getBoxWhisker());
        return response;
    }
}
