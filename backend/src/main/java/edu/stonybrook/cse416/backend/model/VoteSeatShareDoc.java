package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * VoteSeatShareDoc — MongoDB document for the {@code vote_seat_share} collection.
 *
 * <p>One document per state, holding the vote-seat share curve data used by the
 * VS-SS tab in the Racial Polarization section.  This tab is conditionally
 * disabled when {@link #raciallyPolarized} is {@code false}, so the frontend
 * fetches this endpoint only when entering the VS-SS tab.
 *
 * <p>Served by: {@code GET /api/states/{stateId}/vote-seat-share}
 */
@Document(collection = "vote_seat_share")
public class VoteSeatShareDoc {

    /** MongoDB {@code _id} — two-letter state abbreviation (e.g. "AL"). */
    @Id
    private String id;

    /** Two-letter state abbreviation (e.g. "AL"). */
    private String stateId;

    /** Election year (e.g. 2024). */
    private Integer electionYear;

    /**
     * Whether the state exhibits statistically significant racial polarisation.
     * When {@code false} the frontend disables the VS-SS tab with a tooltip.
     */
    private Boolean raciallyPolarized;

    /** Total number of congressional districts. */
    private Integer totalDistricts;

    /**
     * Partisan bias coefficient (signed; positive = Republican advantage).
     * Optional field — may be {@code null} if not computed.
     */
    private Double partisanBias;

    /**
     * Seat-win probability curves, one per party.
     * Each entry: {@code { party, points: [{ voteShare, seatShare }] }}.
     */
    private List<Map<String, Object>> curves;

    /**
     * Enacted plan marker on the VS-SS plot.
     * Shape: {@code { democraticVoteShare, democraticSeatShare, label }}.
     */
    private Map<String, Object> enactedPlan;

    public VoteSeatShareDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStateId() { return stateId; }
    public void setStateId(String stateId) { this.stateId = stateId; }

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
