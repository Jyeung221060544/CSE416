package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.EiCompareDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.service.EiCompareService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * EiCompareController —
 * {@code GET /api/states/{stateId}/ei-compare?race1=&race2=}
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
     * Response: {@code { stateId, races: [r1, r2], label, electionYear,
     * differenceThreshold, candidates: [{ candidateId, candidateName, party,
     *   peakDifference, probDifferenceGT, kdePoints: [{ x, y }] }] }}
     */
    @GetMapping
    public ResponseEntity<EiCompareDoc> getEiCompare(
            @PathVariable State stateId,
            @RequestParam String race1,
            @RequestParam String race2) {

        EiCompareDoc doc = eiCompareService.getEiCompare(stateId, race1.toLowerCase(), race2.toLowerCase());
        if (doc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(doc);
    }
}
