package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * EiKdeDoc — MongoDB document for the {@code ei_kde} collection.
 *
 * <p><b>One document per state.</b>  The raw EI data is stored as-is in
 * candidate-first order: {@code candidates[].racialGroups[].kdePoints}.
 * The frontend receives this shape directly and filters by race client-side
 * using {@code eiRaceFilter}.
 *
 * <p>The {@code _id} is the two-letter state abbreviation (e.g. {@code "AL"}).
 *
 * <p>Served by: {@code GET /api/states/{stateId}/ei}
 */
@Document(collection = "ei_kde")
public class EiKdeDoc {

    @Id
    private String id;
    private State stateId;
    private Integer electionYear;
    private List<Map<String, Object>> candidates;

    public EiKdeDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public State getStateId() { return stateId; }
    public void setStateId(State stateId) { this.stateId = stateId; }

    public Integer getElectionYear() { return electionYear; }
    public void setElectionYear(Integer electionYear) { this.electionYear = electionYear; }

    public List<Map<String, Object>> getCandidates() { return candidates; }
    public void setCandidates(List<Map<String, Object>> candidates) { this.candidates = candidates; }
}
