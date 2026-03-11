package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.service.EnsembleService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * EnsembleController — lazy-loaded ensemble analysis endpoints.
 *
 * <ul>
 *   <li>{@code GET /api/states/{stateId}/ensemble/splits} — fetched when the
 *       user enters the Ensemble Splits tab.</li>
 *   <li>{@code GET /api/states/{stateId}/ensemble/box-whisker} — fetched when
 *       the user enters the Box &amp; Whisker tab.</li>
 * </ul>
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
     * Returns only the splits payload for the given state.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @return 200 with splits data; 404 if state is unknown
     */
    @GetMapping("/splits")
    public ResponseEntity<Map<String, Object>> getSplits(@PathVariable String stateId) {
        Map<String, Object> splits = ensembleService.getSplits(stateId);
        if (splits == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(splits);
    }

    /**
     * Returns only the box-whisker payload for the given state.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @return 200 with box-whisker data; 404 if state is unknown
     */
    @GetMapping("/box-whisker")
    public ResponseEntity<Map<String, Object>> getBoxWhisker(@PathVariable String stateId) {
        Map<String, Object> bw = ensembleService.getBoxWhisker(stateId);
        if (bw == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(bw);
    }
}
