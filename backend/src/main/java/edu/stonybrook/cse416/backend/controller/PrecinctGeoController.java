package edu.stonybrook.cse416.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * PrecinctGeoController —
 * {@code GET /api/states/{stateId}/precincts}
 *
 * <p>Streams the precinct GeoJSON file directly from disk.  Precinct files
 * are too large (~100–140 MB of geometry) to store in MongoDB's 16 MB
 * per-document limit, so they are served as static file streams.
 *
 * <p>Spring Boot's gzip compression (configured in {@code application.properties})
 * compresses responses ≥ 1 KB automatically, reducing the wire size to roughly
 * 20–30 MB for the AL precinct file.
 *
 * <p>File locations are resolved relative to {@code app.geodata.base-path}
 * using the pattern {@code {stateId}_data/{stateId}_precincts_full.geojson}.
 */
@RestController
@RequestMapping("/api/states/{stateId}/geo/precincts")
public class PrecinctGeoController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    /**
     * Root directory that contains the {@code AL_data/} and {@code OR_data/}
     * subdirectories.  Defaults to the project root (one level above the
     * backend working directory).
     */
    @Value("${app.geodata.base-path:..}")
    private String geoBasePath;

    /**
     * Streams the full precinct GeoJSON for the given state.
     *
     * <p>Each precinct feature includes polygon geometry and properties:
     * {@code GEOID, enacted_cd, votes_dem, votes_rep, VAP, NH_BLACK_ALONE_VAP,
     * NH_WHITE_ALONE_VAP, LATINO_VAP, NH_ASIAN_ALONE_VAP, OTHER_VAP}.
     * The frontend uses {@code GEOID} as the stable identifier and array
     * position (matching the heatmap {@code idx} field) for coloring.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @return 200 with GeoJSON stream; 404 if file not found
     */
    @GetMapping
    public ResponseEntity<Resource> getPrecincts(@PathVariable String stateId) {
        String upper = stateId.toUpperCase();
        File file = new File(geoBasePath,
                "frontend/src/assets/" + upper + "PrecinctMap.json");

        if (!file.exists()) return ResponseEntity.notFound().build();

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .cacheControl(CACHE)
                .contentType(MediaType.APPLICATION_JSON)
                .body(resource);
    }
}
