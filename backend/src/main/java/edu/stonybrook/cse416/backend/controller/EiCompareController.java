package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.EiCompareDoc;
import edu.stonybrook.cse416.backend.service.EiCompareService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * EiCompareController —
 * {@code GET /api/states/{stateId}/ei-compare?race1=&race2=}
 *
 * <p>Fetched when the user changes the two-race comparison pair in the
 * {@code Select2RaceFilter} on the EI Bar tab.  There are C(5,2) = 10 possible
 * pairs; each is cached independently so repeat selections are instant.
 *
 * <p>Query parameter order doesn't matter — the service sorts the two races
 * alphabetically before constructing the document ID.
 */
@RestController
@RequestMapping("/api/states/{stateId}/ei-compare")
public class EiCompareController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private final EiCompareService eiCompareService;

    public EiCompareController(EiCompareService eiCompareService) {
        this.eiCompareService = eiCompareService;
    }

    /**
     * Returns EI comparison data for a specific race pair.
     *
     * <p>Response: {@code { stateId, races: [r1, r2], label, electionYear,
     * differenceThreshold, candidates: [{ candidateId, candidateName, party,
     *   peakDifference, probDifferenceGT, kdePoints: [{ x, y }] }] }}
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @param race1   first racial group (any case, any order)
     * @param race2   second racial group
     * @return 200 with data; 404 if pair not computed for this state
     */
    @GetMapping
    public ResponseEntity<EiCompareDoc> getEiCompare(
            @PathVariable String stateId,
            @RequestParam String race1,
            @RequestParam String race2) {

        EiCompareDoc doc = eiCompareService.getEiCompare(stateId, race1.toLowerCase(), race2.toLowerCase());
        if (doc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(doc);
    }
}
