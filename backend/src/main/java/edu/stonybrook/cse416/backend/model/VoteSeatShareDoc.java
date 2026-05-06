package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * VoteSeatShareDoc — MongoDB document for the {@code vote_seat_share} collection.
 *
 * One document per state, holding the vote-seat share curve data used by the
 * VS-SS tab in the Racial Polarization section.  This tab is conditionally
 * disabled when {@link #raciallyPolarized} is {@code false}, so the frontend
 * fetches this endpoint only when entering the VS-SS tab.
 *
 * Served by: {@code GET /api/states/{stateId}/vote-seat-share}
 */
@Document(collection = "vote_seat_share")
public class VoteSeatShareDoc {


    @Id
    private String id;
    private State stateId;
    private Integer electionYear;
    private Boolean raciallyPolarized;
    private Integer totalDistricts;
    private Double partisanBias;
    private List<Map<String, Object>> curves;
    private Map<String, Object> enactedPlan;

    public VoteSeatShareDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public State getStateId() { return stateId; }
    public void setStateId(State stateId) { this.stateId = stateId; }

    public Integer getElectionYear() { return electionYear; }
    public void setElectionYear(Integer electionYear) { this.electionYear = electionYear; }

    public Boolean getRaciallyPolarized() { return raciallyPolarized; }
    public void setRaciallyPolarized(Boolean raciallyPolarized) { this.raciallyPolarized = raciallyPolarized; }

    public Integer getTotalDistricts() { return totalDistricts; }
    public void setTotalDistricts(Integer totalDistricts) { this.totalDistricts = totalDistricts; }

    public Double getPartisanBias() { return partisanBias; }
    public void setPartisanBias(Double partisanBias) { this.partisanBias = partisanBias; }

    public List<Map<String, Object>> getCurves() { return curves; }
    public void setCurves(List<Map<String, Object>> curves) { this.curves = curves; }

    public Map<String, Object> getEnactedPlan() { return enactedPlan; }
    public void setEnactedPlan(Map<String, Object> enactedPlan) { this.enactedPlan = enactedPlan; }
}
