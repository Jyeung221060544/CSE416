package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.service.EnsembleService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * EnsembleController — {@code GET /api/states/{stateId}/ensemble}
 *
 * <p>Fetched when the user enters the Ensemble Analysis section.  Returns both
 * ensemble-analysis payloads (splits + box-whisker) in one response (~6 KB).
 * The feasible-race and compare-mode filters are handled client-side.
 */
@RestController
@RequestMapping("/api/states/{stateId}/ensemble")
public class EnsembleController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private final EnsembleService ensembleService;

    public EnsembleController(EnsembleService ensembleService) {
        this.ensembleService = ensembleService;
    }

    /**
     * Returns the ensemble analysis bundle for the given state.
     *
     * <p>Response: {@code { splits: {...}, boxWhisker: {...} }}
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @return 200 with bundle; 404 if state is unknown
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getEnsemble(@PathVariable String stateId) {
        Map<String, Object> ensemble = ensembleService.getEnsemble(stateId);
        if (ensemble == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(ensemble);
    }
}
