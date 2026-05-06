package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

/**
 * EnsembleDoc — MongoDB document for the {@code ensemble_analysis} collection.
 */
@Document(collection = "ensemble_analysis")
public class EnsembleDoc {

    @Id
    private String id;
    private State stateId;
    private Map<String, Object> splits;
    private Map<String, Object> boxWhisker;

    private Map<String, Object> minorityEffectiveHistogram;
    private Map<String, Object> majorityMinorityHistogram;

    public EnsembleDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public State getStateId() { return stateId; }
    public void setStateId(State stateId) { this.stateId = stateId; }

    public Map<String, Object> getSplits() { return splits; }
    public void setSplits(Map<String, Object> splits) { this.splits = splits; }

    public Map<String, Object> getBoxWhisker() { return boxWhisker; }
    public void setBoxWhisker(Map<String, Object> boxWhisker) { this.boxWhisker = boxWhisker; }

    public Map<String, Object> getMinorityEffectiveHistogram() { return minorityEffectiveHistogram; }
    public void setMinorityEffectiveHistogram(Map<String, Object> h) { this.minorityEffectiveHistogram = h; }

    public Map<String, Object> getMajorityMinorityHistogram() { return majorityMinorityHistogram; }
    public void setMajorityMinorityHistogram(Map<String, Object> h) { this.majorityMinorityHistogram = h; }
}
