package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * EffectivenessDoc — MongoDB document for the {@code effectiveness} collection.
 */
@Document(collection = "effectiveness")
public class EffectivenessDoc {

    @Id
    private String id;
    private State stateId;
    private Integer numDistricts;
    private Integer totalPlans;
    private List<String> feasibleGroups;
    private Map<String, Object> histogram;
    private Map<String, Object> boxWhisker;
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
