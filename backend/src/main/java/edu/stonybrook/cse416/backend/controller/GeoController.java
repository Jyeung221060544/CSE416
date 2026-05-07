package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.service.GeoAssetService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * GeoController — serves GeoJSON assets stored in MongoDB.
 * Both payloads are static (pre-computed) and cached aggressively.
 * Precinct GeoJSONs (~100+ MB) are served by {@code PrecinctGeoController}
 * which streams them directly from disk.
 */
@RestController
public class GeoController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private final GeoAssetService geoService;

    public GeoController(GeoAssetService geoService) {
        this.geoService = geoService;
    }

    /**
     * Returns the GeoJSON FeatureCollection of the 48 contiguous US states.
     * Used by the splash-page map to render state outlines.
     */
    @GetMapping("/api/geo/us-states")
    public ResponseEntity<Map<String, Object>> getUsStates() {
        Map<String, Object> geo = geoService.getUsStates();
        if (geo == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(geo);
    }

    /**
     * Returns the congressional district GeoJSON for the given state.
     * Used by the state overview map to render district boundaries.
     */
    @GetMapping("/api/states/{stateId}/geo/districts")
    public ResponseEntity<Map<String, Object>> getDistricts(@PathVariable State stateId) {
        Map<String, Object> geo = geoService.getDistricts(stateId);
        if (geo == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(geo);
    }

    /**
     * Returns the GeoJSON for a pre-selected interesting ensemble plan.
     */
    @GetMapping("/api/states/{stateId}/geo/interesting-plans/{planType}")
    public ResponseEntity<Map<String, Object>> getInterestingPlan(
            @PathVariable State stateId,
            @PathVariable String planType) {
        Map<String, Object> geo = geoService.getInterestingPlan(stateId, planType);
        if (geo == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(geo);
    }
}
