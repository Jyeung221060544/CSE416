package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * GinglesDoc — MongoDB document for the {@code gingles} collection.
 *
 * <p><b>One document per (state, race) pair.</b>  Splitting by race is the key
 * optimisation for this collection: the full Gingles precinct dataset for AL is
 * ~991 KB across two feasible races (~500 KB each).  Storing them separately
 * means the client only fetches the race currently selected in
 * {@code feasibleRaceFilter}, deferring the other race until the user switches.
 *
 * <p>The {@code _id} follows the pattern {@code "{stateId}_{race}"}
 * (e.g. {@code "AL_black"}).
 *
 * <p>Served by: {@code GET /api/states/{stateId}/gingles?race={race}}
 */
@Document(collection = "gingles")
public class GinglesDoc {

    /** MongoDB {@code _id} — composite key: {@code "{stateId}_{race}"}. */
    @Id
    private String id;

    /** Two-letter state abbreviation (e.g. "AL"). */
    private String stateId;

    /**
     * Racial group key (lowercase), matching {@code feasibleRaceFilter} values.
     * Examples: {@code "black"}, {@code "white"}, {@code "hispanic"}.
     */
    private String race;

    /**
     * Precinct scatter-plot points for this race.
     * Each entry: {@code { id, name, x (minority VAP%), y (dem vote share),
     * totalPop, minorityPop, avgHHIncome, regionType, demVotes, repVotes }}.
     * Typically 1 000–2 000 entries per race.
     */
    private List<Map<String, Object>> points;

    /**
     * Democratic party trendline (OLS regression).
     * Each entry: {@code { x, y }}.
     */
    private List<Map<String, Object>> democraticTrendline;

    /**
     * Republican party trendline (OLS regression).
     * Each entry: {@code { x, y }}.
     */
    private List<Map<String, Object>> republicanTrendline;

    /**
     * Summary statistics grouped by minority VAP% range.
     * Each entry: {@code { rangeLabel, precinctCount,
     * avgDemocraticVoteShare, avgRepublicanVoteShare }}.
     */
    private List<Map<String, Object>> summaryRows;

    public GinglesDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStateId() { return stateId; }
    public void setStateId(String stateId) { this.stateId = stateId; }

    public String getRace() { return race; }
    public void setRace(String race) { this.race = race; }

    public List<Map<String, Object>> getPoints() { return points; }
    public void setPoints(List<Map<String, Object>> points) { this.points = points; }

    public List<Map<String, Object>> getDemocraticTrendline() { return democraticTrendline; }
    public void setDemocraticTrendline(List<Map<String, Object>> democraticTrendline) { this.democraticTrendline = democraticTrendline; }

    public List<Map<String, Object>> getRepublicanTrendline() { return republicanTrendline; }
    public void setRepublicanTrendline(List<Map<String, Object>> republicanTrendline) { this.republicanTrendline = republicanTrendline; }

    public List<Map<String, Object>> getSummaryRows() { return summaryRows; }
    public void setSummaryRows(List<Map<String, Object>> summaryRows) { this.summaryRows = summaryRows; }
}
