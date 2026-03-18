package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.service.OverviewService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * OverviewController — lazy-loaded state overview endpoints.
 *
 * <ul>
 *   <li>{@code GET /api/states/{stateId}/overview/state-stats} — fetched on
 *       state-overview section entry; stateSummary + districtSummary + filter manifests.</li>
 *   <li>{@code GET /api/states/{stateId}/overview/ensemble-demo} — fetched when
 *       the user first opens the Ensemble/Pop Stats tab.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/states/{stateId}/overview")
public class OverviewController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private final OverviewService overviewService;

    public OverviewController(OverviewService overviewService) {
        this.overviewService = overviewService;
    }

    /**
     * Returns the state-stats bundle needed immediately on state-page load.
     *
     * <p>Response: {@code { stateSummary, districtSummary,
     *                        availableHeatmapRaces, availableEiComparePairs }}
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @return 200 with bundle; 404 if state is unknown
     */
    @GetMapping("/state-stats")
    public ResponseEntity<Map<String, Object>> getStateStats(@PathVariable String stateId) {
        Map<String, Object> bundle = overviewService.getStateStats(stateId);
        if (bundle == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(bundle);
    }

    /**
     * Returns the ensemble-demo bundle, fetched lazily when the user opens
     * the Ensemble/Pop Stats tab.
     *
     * <p>Response: {@code { ensembleSummary }}
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @return 200 with bundle; 404 if state is unknown
     */
    @GetMapping("/ensemble-demo")
    public ResponseEntity<Map<String, Object>> getEnsembleDemo(@PathVariable String stateId) {
        Map<String, Object> bundle = overviewService.getEnsembleDemo(stateId);
        if (bundle == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(bundle);
    }
}
