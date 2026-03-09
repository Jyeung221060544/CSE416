package edu.stonybrook.cse416.backend.controller;

import edu.stonybrook.cse416.backend.model.HeatmapDoc;
import edu.stonybrook.cse416.backend.service.HeatmapService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * HeatmapController —
 * {@code GET /api/states/{stateId}/heatmap?granularity=&race=}
 *
 * <p>Fetched when the user enters the Demographic section and each time either
 * {@code raceFilter} or {@code granularityFilter} changes.  Each (granularity,
 * race) combination is an independent document and is cached after the first
 * fetch, so switching back to a previously viewed combination is instant.
 *
 * <p>Valid {@code granularity}: {@code "precinct"} (default), {@code "census_block"}.
 *
 * <p>Valid {@code race} values are <b>not hardcoded</b> — they depend on which
 * racial groups were modelled for a given state.  The frontend reads
 * {@code availableHeatmapRaces} from the {@code /overview} endpoint to know
 * which values are valid before making requests.  The controller uses a safe
 * character-pattern guard (lowercase letters, digits, underscores only) and
 * lets a missing document return 404 rather than maintaining a hardcoded
 * allowlist that would need to change with every new state.
 */
@RestController
@RequestMapping("/api/states/{stateId}/heatmap")
public class HeatmapController {

    private static final CacheControl CACHE = CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    /** Granularity is structural (shapes the query), so it stays enumerated. */
    private static final Set<String> VALID_GRANULARITIES = Set.of("precinct", "census_block");

    /**
     * Race values come from the data and vary by state, so we do NOT maintain a
     * hardcoded allowlist.  Instead we reject anything that looks like an
     * injection attempt: only lowercase letters, digits, and underscores allowed.
     */
    private static final Pattern SAFE_PARAM = Pattern.compile("^[a-z0-9_]+$");

    private final HeatmapService heatmapService;

    public HeatmapController(HeatmapService heatmapService) {
        this.heatmapService = heatmapService;
    }

    /**
     * Returns heatmap data for a specific (granularity, race) slice.
     *
     * <p>Response: {@code { stateId, granularity, race, bins: [...],
     * features: [{ idx, binId }] }}
     *
     * <p>If the requested race was not modelled for this state, 404 is returned.
     * The frontend should consult {@code availableHeatmapRaces} from the
     * {@code /overview} endpoint before calling this endpoint.
     *
     * @param stateId     two-letter state abbreviation (e.g. "AL")
     * @param granularity "precinct" (default) or "census_block"
     * @param race        racial group key, lowercase — varies by state (default: "black")
     * @return 200 with slice; 400 if params fail safety check; 404 if data not found
     */
    @GetMapping
    public ResponseEntity<HeatmapDoc> getHeatmap(
            @PathVariable  String stateId,
            @RequestParam(defaultValue = "precinct") String granularity,
            @RequestParam(defaultValue = "black")    String race) {

        String raceLower = race.toLowerCase();

        if (!VALID_GRANULARITIES.contains(granularity) || !SAFE_PARAM.matcher(raceLower).matches()) {
            return ResponseEntity.badRequest().build();
        }

        HeatmapDoc doc = heatmapService.getHeatmap(stateId, granularity, raceLower);
        if (doc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CACHE).body(doc);
    }
}
