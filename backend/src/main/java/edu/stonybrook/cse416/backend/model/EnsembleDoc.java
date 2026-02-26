package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * EnsembleDoc — MongoDB document model for the {@code ensembles} collection.
 *
 * <p>An ensemble is a set of randomly generated redistricting plans produced
 * by a Markov chain (ReCom) algorithm. Each ensemble belongs to a single state
 * and is characterized by its type (e.g. race-blind, VRA-constrained), the
 * number of plans it contains, and the population equality threshold used
 * during generation.
 *
 * <p>Mapped to the {@code ensembles} collection via
 * {@link Document @Document(collection = "ensembles")}.
 */
@Document(collection = "ensembles")
public class EnsembleDoc {

    /**
     * Unique identifier for this ensemble (MongoDB {@code _id}).
     * Typically a composite string such as {@code "AL_race-blind"}.
     */
    @Id
    private String ensembleId;

    /** Two-letter state abbreviation this ensemble belongs to (e.g. "AL"). */
    private String state;

    /**
     * Ensemble generation algorithm / constraint type.
     * Known values: {@code "race-blind"}, {@code "vra-constrained"}.
     */
    private String ensembleType;

    /** Total number of redistricting plans in this ensemble. */
    private Integer numPlans;

    /**
     * Maximum allowable deviation from the ideal district population, expressed
     * as a decimal fraction (e.g. {@code 0.035} for ±3.5%).
     */
    private Double populationEqualityThreshold;

    /** Human-readable description of the ensemble's methodology or purpose. */
    private String description;

    /** No-arg constructor required by Spring Data MongoDB. */
    public EnsembleDoc() {}

    /**
     * Returns the unique ensemble identifier.
     * @return ensemble ID string.
     */
    public String getEnsembleId() { return ensembleId; }

    /**
     * Sets the unique ensemble identifier.
     * @param ensembleId ensemble ID string.
     */
    public void setEnsembleId(String ensembleId) { this.ensembleId = ensembleId; }

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
     * Returns the ensemble type string.
     * @return type key such as {@code "race-blind"} or {@code "vra-constrained"}.
     */
    public String getEnsembleType() { return ensembleType; }

    /**
     * Sets the ensemble type string.
     * @param ensembleType type key.
     */
    public void setEnsembleType(String ensembleType) { this.ensembleType = ensembleType; }

    /**
     * Returns the total number of plans in this ensemble.
     * @return plan count.
     */
    public Integer getNumPlans() { return numPlans; }

    /**
     * Sets the total number of plans.
     * @param numPlans plan count.
     */
    public void setNumPlans(Integer numPlans) { this.numPlans = numPlans; }

    /**
     * Returns the population equality threshold (as a decimal fraction).
     * @return threshold, e.g. {@code 0.035} for ±3.5%.
     */
    public Double getPopulationEqualityThreshold() { return populationEqualityThreshold; }

    /**
     * Sets the population equality threshold.
     * @param populationEqualityThreshold decimal fraction threshold.
     */
    public void setPopulationEqualityThreshold(Double populationEqualityThreshold) { this.populationEqualityThreshold = populationEqualityThreshold; }

    /**
     * Returns the human-readable description of this ensemble.
     * @return description string.
     */
    public String getDescription() { return description; }

    /**
     * Sets the description of this ensemble.
     * @param description description string.
     */
    public void setDescription(String description) { this.description = description; }
}
