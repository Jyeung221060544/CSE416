package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * EffectivenessDoc — MongoDB document for the {@code effectiveness} collection.
 *
 * <p>Stores the full effectiveness analysis payload for one state in a single
 * document.  Because the data is small (one minority race, three threshold rows),
 * the entire document is returned to the client and race extraction is done
 * on the frontend.
 *
 * <p>Served by: {@code GET /api/states/{stateId}/ensemble/effectiveness}
 */
@Document(collection = "effectiveness")
public class EffectivenessDoc {

    /** MongoDB {@code _id} — two-letter state abbreviation (e.g. "AL"). */
    @Id
    private String id;

    /** State this document belongs to. */
    private State stateId;

    /** Total congressional districts in this state (e.g. 7 for AL). */
    private Integer numDistricts;

    /** Total ensemble plans analysed (e.g. 5000). */
    private Integer totalPlans;

    /**
     * Ordered list of non-white minority race keys included in this document.
     * Example: {@code ["black"]} for AL, {@code ["latino"]} for OR.
     */
    private List<String> feasibleGroups;

    /**
     * Effectiveness histogram payload.
     * Shape: {@code { enactedEffectiveByGroup: { [race]: int },
     *   ensembles: [{ ensembleType, groupCounts: { [race]: [{ numEffective, frequency }] } }] }}.
     */
    private Map<String, Object> histogram;

    /**
     * Box-and-whisker distribution payload.
     * Shape: {@code { enactedPlan: { [race]: int },
     *   ensembles: [{ ensembleType,
     *     groupStats: { [race]: { min, q1, median, mean, q3, max } } }] }}.
     */
    private Map<String, Object> boxWhisker;

    /**
     * VRA impact threshold payload, keyed by minority race.
     * Shape: {@code { [race]: { rows: [{ id, label, raceBlindPct, vraConstrainedPct }] } }}.
     */
    private Map<String, Object> vraImpactThreshold;

    public EffectivenessDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public State getStateId() { return stateId; }
    public void setStateId(State stateId) { this.stateId = stateId; }

    public Integer getNumDistricts() { return numDistricts; }
    public void setNumDistricts(Integer numDistricts) { this.numDistricts = numDistricts; }

    public Integer getTotalPlans() { return totalPlans; }
    public void setTotalPlans(Integer totalPlans) { this.totalPlans = totalPlans; }

    public List<String> getFeasibleGroups() { return feasibleGroups; }
    public void setFeasibleGroups(List<String> feasibleGroups) { this.feasibleGroups = feasibleGroups; }

    public Map<String, Object> getHistogram() { return histogram; }
    public void setHistogram(Map<String, Object> histogram) { this.histogram = histogram; }

    public Map<String, Object> getBoxWhisker() { return boxWhisker; }
    public void setBoxWhisker(Map<String, Object> boxWhisker) { this.boxWhisker = boxWhisker; }

    public Map<String, Object> getVraImpactThreshold() { return vraImpactThreshold; }
    public void setVraImpactThreshold(Map<String, Object> vraImpactThreshold) { this.vraImpactThreshold = vraImpactThreshold; }
}
