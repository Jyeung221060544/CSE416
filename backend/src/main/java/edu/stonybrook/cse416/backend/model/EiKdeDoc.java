package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

/**
 * EiKdeDoc — MongoDB document for the {@code ei_kde} collection.
 *
 * <p><b>One document per (state, race) pair.</b>  The raw EI data is stored
 * candidate-first (candidates → racialGroups → KDE points), but this document
 * inverts that to race-first so the client can request just the KDE curves for
 * the currently toggled race(s) in {@code eiRaceFilter}.
 *
 * <p>The {@code _id} follows the pattern {@code "{stateId}_ei_{race}"}
 * (e.g. {@code "AL_ei_black"}).
 *
 * <p>Each entry in {@code candidates} contains the data for one candidate
 * sliced to only this race: {@code candidateId, candidateName, party,
 * peakSupportEstimate, confidenceIntervalLow, confidenceIntervalHigh,
 * kdePoints: [{x, y}]}.
 *
 * <p>Served by: {@code GET /api/states/{stateId}/ei?race={race}}
 * (called once per race as the user toggles EI race checkboxes).
 */
@Document(collection = "ei_kde")
public class EiKdeDoc {

    /** MongoDB {@code _id} — composite key: {@code "{stateId}_ei_{race}"}. */
    @Id
    private String id;

    /** Two-letter state abbreviation (e.g. "AL"). */
    private String stateId;

    /**
     * Racial group key (may be mixed-case to match source data, e.g. "Black").
     * Normalised to lowercase for ID construction; stored as received.
     */
    private String race;

    /** Election year the EI was computed for (e.g. 2024). */
    private Integer electionYear;

    /**
     * Per-candidate EI KDE data for this race.
     * Each entry: {@code { candidateId, candidateName, party,
     * peakSupportEstimate, confidenceIntervalLow, confidenceIntervalHigh,
     * kdePoints: [{ x, y }] }}.
     */
    private List<Map<String, Object>> candidates;

    public EiKdeDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStateId() { return stateId; }
    public void setStateId(String stateId) { this.stateId = stateId; }

    public String getRace() { return race; }
    public void setRace(String race) { this.race = race; }

    public Integer getElectionYear() { return electionYear; }
    public void setElectionYear(Integer electionYear) { this.electionYear = electionYear; }

    public List<Map<String, Object>> getCandidates() { return candidates; }
    public void setCandidates(List<Map<String, Object>> candidates) { this.candidates = candidates; }
}
