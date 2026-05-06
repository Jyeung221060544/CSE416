package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.model.VoteSeatShareDoc;
import edu.stonybrook.cse416.backend.service.VoteSeatShareService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * VoteSeatShareController —
 * {@code GET /api/states/{stateId}/vote-seat-share}
 */
@RestController
@RequestMapping("/api/states/{stateId}/vote-seat-share")
public class VoteSeatShareController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private final VoteSeatShareService vsService;

    public VoteSeatShareController(VoteSeatShareService vsService) {
        this.vsService = vsService;
    }

    /**
     * Returns vote-seat share data for the given state.
     *
     * <p>Response: {@code { stateId, electionYear, raciallyPolarized,
     * totalDistricts, partisanBias, curves: [...], enactedPlan: {...} }}
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @return 200 with data; 404 if state not found
     */
    @GetMapping
    public ResponseEntity<VoteSeatShareDoc> getVoteSeatShare(@PathVariable State stateId) {
        VoteSeatShareDoc doc = vsService.getVoteSeatShare(stateId);
        if (doc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(doc);
    }
}
