package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.service.CensusBlockService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * CensusBlockGeoController —
 * {@code GET /api/states/{stateId}/census-blocks?bbox=minLon,minLat,maxLon,maxLat}
 *
 * <p>Returns a GeoJSON FeatureCollection containing only the census blocks
 * whose bounding boxes intersect the requested viewport.  The full census
 * files (~300–400 MB) are never sent to the client; only the visible subset
 * is streamed back (typically a few hundred KB at zoom ≥ 10).
 *
 * <p>The {@link CensusBlockService} builds a compact spatial index (~5 MB per
 * state) on startup so each request only scans that small index and then
 * reads matching byte ranges from disk.
 *
 * <h2>Required query parameter</h2>
 * <pre>bbox=minLon,minLat,maxLon,maxLat</pre>
 * Example: {@code ?bbox=-86.9,32.3,-86.7,32.5}
 *
 * <h2>Responses</h2>
 * <ul>
 *   <li>200 — GeoJSON FeatureCollection (may be empty if nothing in viewport)</li>
 *   <li>400 — bbox param missing or malformed</li>
 *   <li>404 — state index not yet loaded (file not found at startup)</li>
 *   <li>503 — state index still initializing</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/states/{stateId}/census-blocks")
public class CensusBlockGeoController {

    private static final CacheControl CACHE = CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic();

    private final CensusBlockService censusBlockService;

    public CensusBlockGeoController(CensusBlockService censusBlockService) {
        this.censusBlockService = censusBlockService;
    }

    @GetMapping
    public ResponseEntity<byte[]> getCensusBlocks(
            @PathVariable String stateId,
            @RequestParam(required = false) String bbox) {

        // bbox is required — refuse full-file requests
        if (bbox == null || bbox.isBlank()) {
            return ResponseEntity.badRequest()
                    .body("bbox query parameter is required (minLon,minLat,maxLon,maxLat)"
                            .getBytes());
        }

        // Parse bbox=minLon,minLat,maxLon,maxLat
        String[] parts = bbox.split(",");
        if (parts.length != 4) {
            return ResponseEntity.badRequest()
                    .body("bbox must have exactly 4 comma-separated values".getBytes());
        }
        double minLon, minLat, maxLon, maxLat;
        try {
            minLon = Double.parseDouble(parts[0].trim());
            minLat = Double.parseDouble(parts[1].trim());
            maxLon = Double.parseDouble(parts[2].trim());
            maxLat = Double.parseDouble(parts[3].trim());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body("bbox values must be valid numbers".getBytes());
        }

        String upper = stateId.toUpperCase();
        if (!censusBlockService.isReady(upper)) {
            return ResponseEntity.status(503)
                    .body(("Census block index for " + upper + " is not available").getBytes());
        }

        try {
            byte[] geojson = censusBlockService.queryBbox(upper, minLon, minLat, maxLon, maxLat);
            if (geojson == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok()
                    .cacheControl(CACHE)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(geojson);
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(("Failed to read census data: " + e.getMessage()).getBytes());
        }
    }
}
