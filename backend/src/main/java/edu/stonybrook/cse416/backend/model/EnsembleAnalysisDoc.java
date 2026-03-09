package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

/**
 * EnsembleAnalysisDoc — MongoDB document for the {@code ensemble_analysis} collection.
 *
 * <p>Combines the two ensemble-analysis payloads into a single document so the
 * {@code GET /api/states/{stateId}/ensemble} endpoint is a single MongoDB read
 * (~6 KB total).
 *
 * <p>Served by: {@code GET /api/states/{stateId}/ensemble}
 */
@Document(collection = "ensemble_analysis")
public class EnsembleAnalysisDoc {

    /** MongoDB {@code _id} — two-letter state abbreviation (e.g. "AL"). */
    @Id
    private String id;

    /**
     * Seat-split histogram payload.
     * Shape: {@code { stateId, numDistricts, totalPlans,
     * enactedPlanSplit: { republican, democratic },
     * ensembles: [{ ensembleId, ensembleType,
     *               splits: [{ republican, democratic, frequency }] }] }}.
     */
    private Map<String, Object> splits;

    /**
     * Box-and-whisker distribution payload.
     * Shape: {@code { stateId, numDistricts, totalPlans, feasibleGroups,
     * ensembles: [{ ensembleId, ensembleType,
     *               groupDistricts: { [race]: [{ index, min, q1, median, mean, q3, max }] } }],
     * enactedPlan: { planId, planType,
     *                groupDistricts: { [race]: [{ index, districtId, groupVapPercentage }] } } }}.
     */
    private Map<String, Object> boxWhisker;

    public EnsembleAnalysisDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Map<String, Object> getSplits() { return splits; }
    public void setSplits(Map<String, Object> splits) { this.splits = splits; }

    public Map<String, Object> getBoxWhisker() { return boxWhisker; }
    public void setBoxWhisker(Map<String, Object> boxWhisker) { this.boxWhisker = boxWhisker; }
}
