package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * HeatmapDoc — MongoDB document for the {@code heatmaps} collection.
 */
@Document(collection = "heatmaps")
public class HeatmapDoc {

    @Id
    private String id;
    private State stateId;
    private String race;

    private List<Map<String, Object>> bins;
    private List<Map<String, Object>> features;

    public HeatmapDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public State getStateId() { return stateId; }
    public void setStateId(State stateId) { this.stateId = stateId; }

    public String getRace() { return race; }
    public void setRace(String race) { this.race = race; }

    public List<Map<String, Object>> getBins() { return bins; }
    public void setBins(List<Map<String, Object>> bins) { this.bins = bins; }

    public List<Map<String, Object>> getFeatures() { return features; }
    public void setFeatures(List<Map<String, Object>> features) { this.features = features; }
}
