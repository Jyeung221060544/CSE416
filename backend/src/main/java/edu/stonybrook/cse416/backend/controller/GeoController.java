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
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code GET /api/geo/us-states}            — 48 contiguous US state outlines</li>
 *   <li>{@code GET /api/states/{stateId}/geo/districts} — congressional district boundaries</li>
 * </ul>
 *
 * <p>Both payloads are static (pre-computed) and cached aggressively.
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
     *
     * <p>Response: standard GeoJSON {@code FeatureCollection} with {@code name}
     * property on each feature (e.g. {@code "Alabama"}).
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
     *
     * <p>Response: standard GeoJSON {@code FeatureCollection}; each feature's
     * {@code properties} include {@code DISTRICT}, {@code winner},
     * {@code dem_share}, {@code votes_dem}, {@code votes_rep}.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @return 200 with GeoJSON; 404 if state not seeded
     */
    @GetMapping("/api/states/{stateId}/geo/districts")
    public ResponseEntity<Map<String, Object>> getDistricts(@PathVariable State stateId) {
        Map<String, Object> geo = geoService.getDistricts(stateId);
        if (geo == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(geo);
    }

    /**
     * Returns the GeoJSON for a pre-selected interesting ensemble plan.
     * Each feature has properties: {@code district, dem_votes, rep_votes,
     * winner, dem_share, plan_id, dem_seats, eff_districts, step}.
     *
     * @param stateId  two-letter state abbreviation
     * @param planType "low" (zero effective minority districts) or
     *                 "high" (extra democratic / high effective; OR only)
     * @return 200 with GeoJSON; 404 if this state+planType has no data
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
