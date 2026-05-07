package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.EiKdeDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.service.EiService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * EiController — {@code GET /api/states/{stateId}/ei}
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
     * Returns EI KDE data for all candidates and racial groups for the given state.
     *
     * Response: {@code { stateId, electionYear,
     * candidates: [{ candidateId, candidateName, party,
     *                racialGroups: [{ group, peakSupportEstimate,
     *                                confidenceIntervalLow, confidenceIntervalHigh,
     *                                kdePoints: [{ x, y }] }] }] }}
     */
    @GetMapping
    public ResponseEntity<EiKdeDoc> getEiKde(@PathVariable State stateId) {
        EiKdeDoc doc = eiService.getEiKde(stateId);
        if (doc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(doc);
    }
}
