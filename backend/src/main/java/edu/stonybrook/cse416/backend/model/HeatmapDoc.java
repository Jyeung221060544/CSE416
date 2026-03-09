package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * HeatmapDoc — MongoDB document for the {@code heatmaps} collection.
 *
 * <p><b>One document per (state, granularity, race) triple.</b>
 * Splitting by race is essential for real datasets where precinct-level data
 * can exceed 50 000+ units — storing all 5 races together would produce
 * 250 000+ feature values per document.  Each race document is ~1/5 the size
 * and is fetched only when {@code raceFilter} selects that race.
 *
 * <p>The {@code _id} follows the pattern
 * {@code "{stateId}_{granularity}_{race}"}
 * (e.g. {@code "AL_precinct_black"}).
 *
 * <p>The {@code bins} array (5 colour thresholds) is the same for every race
 * in a given state; it is stored in each document for self-containedness.
 *
 * <p>Served by:
 * {@code GET /api/states/{stateId}/heatmap?granularity=&race=}
 * (fetched once per (granularity, race) pair; subsequent requests for the
 * same combination are served from the Caffeine cache).
 */
@Document(collection = "heatmaps")
public class HeatmapDoc {

    /**
     * MongoDB {@code _id} — composite key:
     * {@code "{stateId}_{granularity}_{race}"} (e.g. "AL_precinct_black").
     */
    @Id
    private String id;

    /** Two-letter state abbreviation (e.g. "AL"). */
    private String stateId;

    /**
     * Spatial granularity: {@code "precinct"} or {@code "census_block"}.
     * Matches the {@code granularity} query parameter.
     */
    private String granularity;

    /**
     * Racial group key (lowercase), matching {@code raceFilter} values.
     * Examples: {@code "black"}, {@code "white"}, {@code "hispanic"},
     * {@code "asian"}, {@code "other"}.
     */
    private String race;

    /**
     * Five colour bins used to paint the choropleth map.
     * Each entry: {@code { binId, rangeMin, rangeMax, color }}.
     * Bins are the same across races; stored here for self-containedness.
     */
    private List<Map<String, Object>> bins;

    /**
     * Per-unit bin assignments for this race only.
     * Each entry: {@code { idx, binId }} where {@code binId} references
     * an entry in {@link #bins}.  Much smaller than the all-races format.
     */
    private List<Map<String, Object>> features;

    public HeatmapDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStateId() { return stateId; }
    public void setStateId(String stateId) { this.stateId = stateId; }

    public String getGranularity() { return granularity; }
    public void setGranularity(String granularity) { this.granularity = granularity; }

    public String getRace() { return race; }
    public void setRace(String race) { this.race = race; }

    public List<Map<String, Object>> getBins() { return bins; }
    public void setBins(List<Map<String, Object>> bins) { this.bins = bins; }

    public List<Map<String, Object>> getFeatures() { return features; }
    public void setFeatures(List<Map<String, Object>> features) { this.features = features; }
}
