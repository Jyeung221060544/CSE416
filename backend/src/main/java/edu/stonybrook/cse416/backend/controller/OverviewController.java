package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.service.OverviewService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * OverviewController — {@code GET /api/states/{stateId}/overview}
 *
 * <p>Fetched once when the user navigates to a state page.  Returns the three
 * small payloads needed immediately: stateSummary, districtSummary, and
 * ensembleSummary (~3 KB combined).
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
     * Returns the overview bundle for the given state.
     *
     * <p>Response: {@code { stateSummary, districtSummary, ensembleSummary }}
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @return 200 with bundle; 404 if state is unknown
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getOverview(@PathVariable String stateId) {
        Map<String, Object> overview = overviewService.getOverview(stateId);
        if (overview == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(overview);
    }
}
