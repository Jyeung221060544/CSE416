package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.EiKdeDoc;
import edu.stonybrook.cse416.backend.service.EiService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * EiController — {@code GET /api/states/{stateId}/ei?race=}
 *
 * <p>The frontend {@code eiRaceFilter} is a multi-select.  When the user
 * toggles a race on, the frontend fetches this endpoint for that race and
 * merges the result with any previously fetched races client-side.  Each
 * per-race payload is small (~2 KB), so independent caching per (state, race)
 * keeps the cache compact and repeat-toggles instant.
 *
 * <p>The {@code race} parameter is case-insensitive (stored data may use title
 * case, e.g. "Black").
 */
@RestController
@RequestMapping("/api/states/{stateId}/ei")
public class EiController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private final EiService eiService;

    public EiController(EiService eiService) {
        this.eiService = eiService;
    }

    /**
     * Returns EI KDE data for one racial group across all candidates.
     *
     * <p>Response: {@code { stateId, race, electionYear,
     * candidates: [{ candidateId, candidateName, party,
     *                peakSupportEstimate, confidenceIntervalLow, confidenceIntervalHigh,
     *                kdePoints: [{ x, y }] }] }}
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @param race    racial group key — case-insensitive (e.g. "black", "Black")
     * @return 200 with data; 404 if state or race not found
     */
    @GetMapping
    public ResponseEntity<EiKdeDoc> getEiKde(
            @PathVariable String stateId,
            @RequestParam String race) {

        EiKdeDoc doc = eiService.getEiKde(stateId, race.toLowerCase());
        if (doc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(doc);
    }
}
