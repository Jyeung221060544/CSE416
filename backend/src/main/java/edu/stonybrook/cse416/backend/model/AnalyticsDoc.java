package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

/**
 * AnalyticsDoc — MongoDB document model for the {@code analytics} collection.
 *
 * <p>Each document stores a pre-computed analytics payload for a specific
 * combination of state, analysis type, demographic group, and ensemble. The
 * flexible {@code payload} map allows different analysis types (district
 * summary, Gingles binning, heatmap bins, etc.) to share a single collection
 * without requiring separate schemas.
 *
 * <p>Fields that narrow the scope of the document (state, type, ensembleId,
 * demographicGroup, granularity, electionYear) form a compound logical key
 * that API controllers use to look up the correct document for a given request.
 *
 * <p>Mapped to the {@code analytics} collection via
 * {@link Document @Document(collection = "analytics")}.
 */
@Document(collection = "analytics")
public class AnalyticsDoc {

    /** MongoDB document ID — auto-generated unique identifier. */
    @Id
    private String id;

    /** Two-letter state abbreviation this analytic result belongs to (e.g. "AL"). */
    private String state;

    /**
     * Analysis type discriminator. Known values include:
     * {@code "district_summary"}, {@code "gingles_summary"},
     * {@code "heatmap"}, {@code "ensemble_summary"}, {@code "state_summary"}.
     */
    private String type;

    /**
     * Election year that the underlying vote data is drawn from
     * (e.g. {@code 2024}).
     */
    private Integer electionYear;

    /**
     * Racial/ethnic group key this analytic was computed for
     * (e.g. {@code "black"}, {@code "hispanic"}). {@code null} for
     * non-demographic analytics.
     */
    private String demographicGroup;

    /**
     * Reference to the parent {@link EnsembleDoc#getEnsembleId() ensembleId}.
     * {@code null} for analytics that are not ensemble-specific
     * (e.g. state-level demographics).
     */
    private String ensembleId;

    /**
     * Ensemble type string (mirrors {@link EnsembleDoc#getEnsembleType()}).
     * Stored here for fast filtering without a join.
     */
    private String ensembleType;

    /**
     * Spatial granularity for heatmap analytics.
     * Known values: {@code "precinct"}, {@code "census_block"}.
     * {@code null} for non-spatial analytics.
     */
    private String granularity;

    /**
     * Flexible payload map containing the actual computed data.
     * Shape varies by {@link #type}; for example, a {@code "heatmap"} payload
     * contains {@code bins} and {@code features} arrays.
     */
    private Map<String,Object> payload;

    /**
     * Timestamp of the last time this document was written or updated.
     * Stored as {@link Instant} for timezone-safe serialization.
     */
    private Instant updatedAt;

    /** No-arg constructor required by Spring Data MongoDB. */
    public AnalyticsDoc() {}

    /**
     * Returns the MongoDB document ID.
     * @return document ID string.
     */
    public String getId() { return id; }

    /**
     * Sets the MongoDB document ID.
     * @param id document ID string.
     */
    public void setId(String id) { this.id = id; }

    /**
     * Returns the two-letter state abbreviation.
     * @return state abbreviation (e.g. "AL").
     */
    public String getState() { return state; }

    /**
     * Sets the two-letter state abbreviation.
     * @param state state abbreviation.
     */
    public void setState(String state) { this.state = state; }

    /**
     * Returns the analysis type discriminator.
     * @return type string (e.g. "district_summary", "heatmap").
     */
    public String getType() { return type; }

    /**
     * Sets the analysis type discriminator.
     * @param type type string.
     */
    public void setType(String type) { this.type = type; }

    /**
     * Returns the election year used for vote-data analytics.
     * @return four-digit election year, or {@code null}.
     */
    public Integer getElectionYear() { return electionYear; }

    /**
     * Sets the election year.
     * @param electionYear four-digit year integer.
     */
    public void setElectionYear(Integer electionYear) { this.electionYear = electionYear; }

    /**
     * Returns the demographic group key this analytic was computed for.
     * @return race group key (e.g. "black"), or {@code null}.
     */
    public String getDemographicGroup() { return demographicGroup; }

    /**
     * Sets the demographic group key.
     * @param demographicGroup race group key.
     */
    public void setDemographicGroup(String demographicGroup) { this.demographicGroup = demographicGroup; }

    /**
     * Returns the parent ensemble ID.
     * @return ensemble ID string, or {@code null} for non-ensemble analytics.
     */
    public String getEnsembleId() { return ensembleId; }

    /**
     * Sets the parent ensemble ID.
     * @param ensembleId ensemble ID string.
     */
    public void setEnsembleId(String ensembleId) { this.ensembleId = ensembleId; }

    /**
     * Returns the ensemble type string (denormalized from EnsembleDoc).
     * @return ensemble type key (e.g. "race-blind").
     */
    public String getEnsembleType() { return ensembleType; }

    /**
     * Sets the ensemble type string.
     * @param ensembleType ensemble type key.
     */
    public void setEnsembleType(String ensembleType) { this.ensembleType = ensembleType; }

    /**
     * Returns the spatial granularity for heatmap analytics.
     * @return granularity string ("precinct" or "census_block"), or {@code null}.
     */
    public String getGranularity() { return granularity; }

    /**
     * Sets the spatial granularity.
     * @param granularity "precinct" or "census_block".
     */
    public void setGranularity(String granularity) { this.granularity = granularity; }

    /**
     * Returns the computed analytics payload.
     * @return flexible key-value map; structure varies by type.
     */
    public Map<String,Object> getPayload() { return payload; }

    /**
     * Sets the analytics payload.
     * @param payload key-value map of computed results.
     */
    public void setPayload(Map<String,Object> payload) { this.payload = payload; }

    /**
     * Returns the last-updated timestamp.
     * @return {@link Instant} of the most recent write.
     */
    public Instant getUpdatedAt() { return updatedAt; }

    /**
     * Sets the last-updated timestamp.
     * @param updatedAt {@link Instant} of the write.
     */
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
