package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.service.OverviewService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * OverviewController — lazy-loaded state overview endpoints.
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
     * Response: {@code { stateSummary, districtSummary,
     *                        availableHeatmapRaces, availableEiComparePairs }}
     */
    @GetMapping("/state-stats")
    public ResponseEntity<Map<String, Object>> getStateStats(@PathVariable State stateId) {
        Map<String, Object> bundle = overviewService.getStateStats(stateId);
        if (bundle == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(bundle);
    }


}
