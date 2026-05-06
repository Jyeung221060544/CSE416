package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * GinglesDoc — MongoDB document for the {@code gingles} collection.
 */
@Document(collection = "gingles")
public class GinglesDoc {

    
    @Id
    private String id;
    private State stateId;
    private String race;
    private List<Map<String, Object>> points;
    private List<Map<String, Object>> democraticTrendline;
    private List<Map<String, Object>> republicanTrendline;
    private List<Map<String, Object>> summaryRows;

    public GinglesDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public State getStateId() { return stateId; }
    public void setStateId(State stateId) { this.stateId = stateId; }

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
