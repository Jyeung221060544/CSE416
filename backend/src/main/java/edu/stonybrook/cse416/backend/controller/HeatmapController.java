package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.HeatmapDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.service.HeatmapService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * HeatmapController —
 * {@code GET /api/states/{stateId}/heatmap?race=}
 */
@RestController
@RequestMapping("/api/states/{stateId}/heatmap")
public class HeatmapController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private static final Pattern SAFE_PARAM = Pattern.compile("^[a-z0-9_]+$");

    private final HeatmapService heatmapService;

    public HeatmapController(HeatmapService heatmapService) {
        this.heatmapService = heatmapService;
    }

    /**
     * Returns heatmap data for a specific race slice (precinct granularity only).
     * Response: {@code { stateId, race, bins: [...], features: [{ idx, binId }] }}
     */
    @GetMapping
    public ResponseEntity<HeatmapDoc> getHeatmap(
            @PathVariable State stateId,
            @RequestParam(defaultValue = "black") String race) {

        String raceLower = race.toLowerCase();

        if (!SAFE_PARAM.matcher(raceLower).matches()) {
            return ResponseEntity.badRequest().build();
        }

        HeatmapDoc doc = heatmapService.getHeatmap(stateId, raceLower);
        if (doc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(doc);
    }
}
