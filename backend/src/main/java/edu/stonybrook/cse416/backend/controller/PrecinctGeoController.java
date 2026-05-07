package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.model.StateDoc;
import edu.stonybrook.cse416.backend.repository.StateRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * PrecinctGeoController —
 * {@code GET /api/states/{stateId}/precincts}
 *
 * Streams the precinct GeoJSON file directly from disk.  Precinct files
 * are too large (~100–140 MB of geometry) to store in MongoDB's 16 MB
 * per-document limit, so they are served as static file streams.

 */
@RestController
@RequestMapping("/api/states/{stateId}/geo/precincts")
public class PrecinctGeoController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();
    
    @Value("${app.geodata.base-path:..}")
    private String geoBasePath;

    private final StateRepository stateRepo;

    public PrecinctGeoController(StateRepository stateRepo) {
        this.stateRepo = stateRepo;
    }

    /**
     * Streams the full precinct GeoJSON for the given state.
     * Return 200 with GeoJSON stream; 404 if state or file not found
     */
    @GetMapping
    public ResponseEntity<Resource> getPrecincts(@PathVariable State stateId) {
        Optional<StateDoc> stateOpt = stateRepo.findByStateId(stateId);
        if (stateOpt.isEmpty()) return ResponseEntity.notFound().build();

        String path = stateOpt.get().getPrecinctGeoPath();
        File file = new File(geoBasePath, path);

        if (!file.exists()) return ResponseEntity.notFound().build();

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .cacheControl(CACHE)
                .contentType(MediaType.APPLICATION_JSON)
                .body(resource);
    }
}
