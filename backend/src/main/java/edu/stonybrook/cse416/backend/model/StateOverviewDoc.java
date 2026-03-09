package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * StateOverviewDoc — MongoDB document for the {@code state_overview} collection.
 *
 * <p>Groups the three small payloads needed immediately when a user opens a state
 * page: state-level summary, district table, and ensemble metadata.  Stored as
 * one document so the {@code GET /api/states/{stateId}/overview} endpoint is a
 * single MongoDB read (~3 KB total).
 *
 * <p>Served by: {@code GET /api/states/{stateId}/overview}
 */
@Document(collection = "state_overview")
public class StateOverviewDoc {

    /** MongoDB {@code _id} — two-letter state abbreviation (e.g. "AL"). */
    @Id
    private String id;

    /**
     * Full state summary payload.
     * Shape: {@code { stateId, stateName, totalPopulation, votingAgePopulation,
     * numDistricts, idealDistrictPopulation, isPreclearance, mapView,
     * voterDistribution, demographicGroups, redistrictingControl,
     * congressionalRepresentatives }}.
     */
    private Map<String, Object> stateSummary;

    /**
     * District-level summary payload.
     * Shape: {@code { stateId, planType, electionYear,
     * districts: [{ districtId, districtNumber, representative, party,
     *               racialGroup, voteMarginPercentage, voteMarginDirection }] }}.
     */
    private Map<String, Object> districtSummary;

    /**
     * Ensemble metadata payload.
     * Shape: {@code { stateId,
     * ensembles: [{ ensembleId, ensembleType, numPlans,
     *               populationEqualityThreshold, description }] }}.
     */
    private Map<String, Object> ensembleSummary;

    /**
     * Racial group keys present in the heatmap data for this state.
     * Discovered at seed time from the feature map keys in the source JSON —
     * never hardcoded, since different states may model different racial groups.
     *
     * <p>Example: {@code ["black", "white", "hispanic", "asian", "other"]}.
     * The frontend uses this list to know which {@code race} values are valid
     * for {@code GET /heatmap?race=} requests.
     */
    private List<String> availableHeatmapRaces;

    /**
     * Race pairs for which EI comparison data is available.
     * Each entry is a sorted two-element list, e.g. {@code ["black", "white"]}.
     *
     * <p>The frontend uses this to enable only valid options in
     * {@code Select2RaceFilter} — pairs absent from this list will 404 and
     * should not be offered.  Composition varies by state and what EI modelled.
     */
    private List<List<String>> availableEiComparePairs;

    public StateOverviewDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Map<String, Object> getStateSummary() { return stateSummary; }
    public void setStateSummary(Map<String, Object> stateSummary) { this.stateSummary = stateSummary; }

    public Map<String, Object> getDistrictSummary() { return districtSummary; }
    public void setDistrictSummary(Map<String, Object> districtSummary) { this.districtSummary = districtSummary; }

    public Map<String, Object> getEnsembleSummary() { return ensembleSummary; }
    public void setEnsembleSummary(Map<String, Object> ensembleSummary) { this.ensembleSummary = ensembleSummary; }

    public List<String> getAvailableHeatmapRaces() { return availableHeatmapRaces; }
    public void setAvailableHeatmapRaces(List<String> availableHeatmapRaces) {
        this.availableHeatmapRaces = availableHeatmapRaces;
    }

    public List<List<String>> getAvailableEiComparePairs() { return availableEiComparePairs; }
    public void setAvailableEiComparePairs(List<List<String>> availableEiComparePairs) {
        this.availableEiComparePairs = availableEiComparePairs;
    }
}
