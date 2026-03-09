package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * EiCompareDoc — MongoDB document for the {@code ei_compare} collection.
 *
 * <p><b>One document per (state, race-pair) combination.</b>  The raw EI-compare
 * data contains 10 race pairs (all C(5,2) combinations of 5 racial groups).
 * Splitting by pair means the client only fetches the pair currently selected
 * via {@code eiKdeCompareRaces}, saving the transfer of 9 unused pairs.
 *
 * <p>The {@code _id} follows the pattern
 * {@code "{stateId}_eicompare_{race1}_{race2}"} where race1 < race2
 * alphabetically (e.g. {@code "AL_eicompare_black_white"}).  The sort is applied
 * at seed time so the endpoint can construct a deterministic key regardless of
 * query param order.
 *
 * <p>Served by:
 * {@code GET /api/states/{stateId}/ei-compare?race1={r1}&race2={r2}}
 * (called when the user changes the polarisation comparison pair).
 */
@Document(collection = "ei_compare")
public class EiCompareDoc {

    /**
     * MongoDB {@code _id} — composite key:
     * {@code "{stateId}_eicompare_{race1}_{race2}"} (races sorted alphabetically).
     */
    @Id
    private String id;

    /** Two-letter state abbreviation (e.g. "AL"). */
    private String stateId;

    /**
     * The two races being compared, sorted alphabetically.
     * Example: {@code ["black", "white"]}.
     */
    private List<String> races;

    /** Human-readable pair label (e.g. "Black vs White"). */
    private String label;

    /** Election year the EI was computed for. */
    private Integer electionYear;

    /**
     * Minimum absolute difference threshold used in the probability calculation.
     * Example: {@code 0.1} means P(|diff| > 0.1).
     */
    private Double differenceThreshold;

    /**
     * Per-candidate comparison KDE data for this race pair.
     * Each entry: {@code { candidateId, candidateName, party,
     * peakDifference, probDifferenceGT, kdePoints: [{ x, y }] }}.
     */
    private List<Map<String, Object>> candidates;

    public EiCompareDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStateId() { return stateId; }
    public void setStateId(String stateId) { this.stateId = stateId; }

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
