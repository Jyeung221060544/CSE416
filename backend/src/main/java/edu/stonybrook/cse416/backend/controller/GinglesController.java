package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.GinglesDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.service.GinglesService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * GinglesController — {@code GET /api/states/{stateId}/gingles?race=}
 */
@RestController
@RequestMapping("/api/states/{stateId}/gingles")
public class GinglesController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private final GinglesService ginglesService;

    public GinglesController(GinglesService ginglesService) {
        this.ginglesService = ginglesService;
    }

    /**
     * Returns Gingles precinct data for one racial group.
     * Response: {@code { stateId, race, points: [...],
     * democraticTrendline: [...], republicanTrendline: [...], summaryRows: [...] }}
     */
    @GetMapping
    public ResponseEntity<GinglesDoc> getGingles(
            @PathVariable State stateId,
            @RequestParam String race) {

        GinglesDoc doc = ginglesService.getGingles(stateId, race.toLowerCase());
        if (doc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(doc);
    }
}
