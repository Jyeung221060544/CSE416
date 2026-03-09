package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.GinglesDoc;
import edu.stonybrook.cse416.backend.service.GinglesService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * GinglesController — {@code GET /api/states/{stateId}/gingles?race=}
 *
 * <p>Fetched when the user enters the Gingles tab, and again each time they
 * change {@code feasibleRaceFilter}.  Each race is fetched independently
 * (~500 KB each) and cached, so switching back to a previously viewed race
 * is served from the Caffeine cache without a MongoDB round-trip.
 *
 * <p>The {@code race} parameter must be a lowercase racial group key
 * (e.g. {@code "black"}, {@code "white"}).
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
     *
     * <p>Response: {@code { stateId, race, points: [...],
     * democraticTrendline: [...], republicanTrendline: [...], summaryRows: [...] }}
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @param race    lowercase racial group key (e.g. "black")
     * @return 200 with data; 404 if state or race not found
     */
    @GetMapping
    public ResponseEntity<GinglesDoc> getGingles(
            @PathVariable String stateId,
            @RequestParam String race) {

        GinglesDoc doc = ginglesService.getGingles(stateId, race.toLowerCase());
        if (doc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(doc);
    }
}
