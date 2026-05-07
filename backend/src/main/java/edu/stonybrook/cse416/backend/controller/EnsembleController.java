package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.service.EnsembleService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * EnsembleController — lazy-loaded ensemble analysis endpoints.
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
     */
    @GetMapping("/splits")
    public ResponseEntity<Map<String, Object>> getSplits(@PathVariable State stateId) {
        Map<String, Object> splits = ensembleService.getSplits(stateId);
        if (splits == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(splits);
    }

    /**
     * Returns only the box-whisker payload for the given state.
     */
    @GetMapping("/box-whisker")
    public ResponseEntity<Map<String, Object>> getBoxWhisker(@PathVariable State stateId) {
        Map<String, Object> bw = ensembleService.getBoxWhisker(stateId);
        if (bw == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(bw);
    }

    @GetMapping("/minority-districts")
    public ResponseEntity<Map<String, Object>> getMinorityDistricts(@PathVariable State stateId) {
        Map<String, Object> data = ensembleService.getMinorityDistricts(stateId);
        if (data == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(data);
    }
}
