package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

/**
 * StateDoc — MongoDB document model for the {@code states} collection.
 *
 * <p>Each document represents a US state that is available for analysis in
 * the redistricting application. The {@code id} field stores the two-letter
 * state abbreviation (e.g. {@code "AL"}, {@code "OR"}) and serves as both
 * the MongoDB {@code _id} and the stateId used throughout the API.
 *
 * <p>Mapped to the {@code states} collection via
 * {@link Document @Document(collection = "states")}.
 */
@Document(collection = "states")
public class StateDoc {

    /** MongoDB document ID — two-letter state abbreviation (e.g. "AL", "OR"). */
    @Id
    private String id; // AL, OR

    /** Full display name of the state (e.g. "Alabama"). */
    private String name;

    /**
     * Whether the state is subject to Section 5 preclearance requirements
     * under the Voting Rights Act (historical designation).
     */
    private Boolean isPreclearance;

    /** Number of congressional districts in the state. */
    private Integer numDistricts;

    /**
     * Geographic center of the state used to position the splash-screen map.
     * Expected keys: {@code "lat"} (double) and {@code "lng"} (double).
     */
    private Map<String, Object> center;

    /** Default Leaflet zoom level for the state's map view. */
    private Integer zoom;

    /**
     * Whether analysis data (precincts, ensembles, heatmaps) is available
     * for this state. States with {@code hasData = false} are rendered as
     * inactive on the splash map.
     */
    private Boolean hasData;

    /** No-arg constructor required by Spring Data MongoDB. */
    public StateDoc() {}

    /**
     * Returns the state abbreviation / MongoDB document ID.
     * @return two-letter state ID (e.g. "AL").
     */
    public String getId() { return id; }

    /**
     * Sets the state abbreviation / MongoDB document ID.
     * @param id two-letter state abbreviation.
     */
    public void setId(String id) { this.id = id; }

    /**
     * Returns the full display name of the state.
     * @return state name (e.g. "Alabama").
     */
    public String getName() { return name; }

    /**
     * Sets the full display name of the state.
     * @param name state name.
     */
    public void setName(String name) { this.name = name; }

    /**
     * Returns whether the state has a VRA Section 5 preclearance designation.
     * @return {@code true} if preclearance applies.
     */
    public Boolean getIsPreclearance() { return isPreclearance; }

    /**
     * Sets the VRA preclearance flag.
     * @param isPreclearance {@code true} if preclearance applies.
     */
    public void setIsPreclearance(Boolean isPreclearance) { this.isPreclearance = isPreclearance; }

    /**
     * Returns the number of congressional districts in the state.
     * @return district count.
     */
    public Integer getNumDistricts() { return numDistricts; }

    /**
     * Sets the number of congressional districts.
     * @param numDistricts district count.
     */
    public void setNumDistricts(Integer numDistricts) { this.numDistricts = numDistricts; }

    /**
     * Returns the geographic center coordinates used for the map view.
     * @return map with keys {@code "lat"} and {@code "lng"}.
     */
    public Map<String, Object> getCenter() { return center; }

    /**
     * Sets the geographic center coordinates.
     * @param center map with keys {@code "lat"} and {@code "lng"}.
     */
    public void setCenter(Map<String, Object> center) { this.center = center; }

    /**
     * Returns the default Leaflet zoom level for this state.
     * @return zoom level integer.
     */
    public Integer getZoom() { return zoom; }

    /**
     * Sets the default Leaflet zoom level.
     * @param zoom zoom level integer.
     */
    public void setZoom(Integer zoom) { this.zoom = zoom; }

    /**
     * Returns whether analysis data is available for this state.
     * @return {@code true} if the state has data loaded.
     */
    public Boolean getHasData() { return hasData; }

    /**
     * Sets the data-availability flag.
     * @param hasData {@code true} if analysis data exists.
     */
    public void setHasData(Boolean hasData) { this.hasData = hasData; }
}
