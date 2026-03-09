package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.service.StateService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * StateController — {@code GET /api/states}
 *
 * <p>Returns the splash-page list of all states with metadata used to render
 * the interactive US map and the state-selection cards.
 */
@RestController
@RequestMapping("/api/states")
public class StateController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    private final StateService stateService;

    public StateController(StateService stateService) {
        this.stateService = stateService;
    }

    /**
     * Returns all states.
     *
     * <p>Response: {@code { states: [{ stateId, stateName, hasData,
     * numDistricts, isPreclearance, center, zoom }] }}
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listStates() {
        return ResponseEntity.ok()
                .cacheControl(CACHE)
                .body(stateService.listStates());
    }
}
