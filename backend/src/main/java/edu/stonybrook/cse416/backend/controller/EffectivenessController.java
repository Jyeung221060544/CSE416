package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.service.EffectivenessService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * EffectivenessController — effectiveness analysis endpoint.
 * The entire document is returned in one response.  Race filtering
 * is handled on the frontend — no {@code ?race=} query parameter is needed.
 */
@RestController
@RequestMapping("/api/states/{stateId}")
public class EffectivenessController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private final EffectivenessService effectivenessService;

    public EffectivenessController(EffectivenessService effectivenessService) {
        this.effectivenessService = effectivenessService;
    }

    /**
     * Returns the full effectiveness analysis payload for the given state.
     */
    @GetMapping("/effectiveness")
    public ResponseEntity<Map<String, Object>> getEffectiveness(@PathVariable State stateId) {
        Map<String, Object> data = effectivenessService.getEffectiveness(stateId);
        if (data == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(data);
    }
}
