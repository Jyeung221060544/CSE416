package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * EiCompareDoc — MongoDB document for the {@code ei_compare} collection.
 */
@Document(collection = "ei_compare")
public class EiCompareDoc {

    @Id
    private String id;
    private State stateId;
    private List<String> races;
    private String label;
    private Integer electionYear;
    private Double differenceThreshold;
    private List<Map<String, Object>> candidates;

    public EiCompareDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public State getStateId() { return stateId; }
    public void setStateId(State stateId) { this.stateId = stateId; }

    public List<String> getRaces() { return races; }
    public void setRaces(List<String> races) { this.races = races; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Integer getElectionYear() { return electionYear; }
    public void setElectionYear(Integer electionYear) { this.electionYear = electionYear; }

    public Double getDifferenceThreshold() { return differenceThreshold; }
    public void setDifferenceThreshold(Double differenceThreshold) { this.differenceThreshold = differenceThreshold; }

    public List<Map<String, Object>> getCandidates() { return candidates; }
    public void setCandidates(List<Map<String, Object>> candidates) { this.candidates = candidates; }
}
