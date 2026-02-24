package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

/**
 * PrecinctDoc — MongoDB document model for the {@code precincts} collection.
 *
 * <p>Each document represents a single voting precinct (or equivalent geographic
 * unit) for a state. Documents store the precinct's identifier, its position
 * in the precinct adjacency graph ({@code idx}), a flexible {@code props} map
 * holding demographic and election attributes, and a GeoJSON-compatible
 * {@code geometry} map for map rendering.
 *
 * <p>Mapped to the {@code precincts} collection via
 * {@link Document @Document(collection = "precincts")}.
 */
@Document(collection = "precincts")
public class PrecinctDoc {

    /** MongoDB document ID — unique identifier for this precinct document. */
    @Id
    private String id;

    /** Two-letter state abbreviation this precinct belongs to (e.g. "AL"). */
    private String state;

    /**
     * Geographic GEOID from the Census Bureau (e.g. 15-digit block GEOID
     * or state-assigned precinct GEOID). Used as the canonical precinct key
     * when joining to other datasets.
     */
    private String geoid;

    /**
     * Zero-based integer index of this precinct in the precinct adjacency
     * graph. Corresponds to the position in {@link PlanDoc#getAssignments()}.
     */
    private Integer idx;

    /**
     * Flexible property bag holding demographic, election, and regional
     * attributes. Expected keys include: {@code VAP}, {@code votes_dem},
     * {@code votes_rep}, {@code enacted_cd}, {@code region_type},
     * {@code NH_BLACK_ALONE_VAP}, etc.
     */
    private Map<String,Object> props;

    /**
     * GeoJSON geometry object for the precinct polygon. Expected shape:
     * {@code { "type": "Polygon"|"MultiPolygon", "coordinates": [...] }}.
     * Stored as a raw map so it can be passed directly to the frontend.
     */
    private Map<String,Object> geometry;

    /** No-arg constructor required by Spring Data MongoDB. */
    public PrecinctDoc() {}

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
     * Returns the Census GEOID for this precinct.
     * @return GEOID string.
     */
    public String getGeoid() { return geoid; }

    /**
     * Sets the Census GEOID for this precinct.
     * @param geoid GEOID string.
     */
    public void setGeoid(String geoid) { this.geoid = geoid; }

    /**
     * Returns the zero-based graph index for this precinct.
     * @return integer index in the precinct adjacency graph.
     */
    public Integer getIdx() { return idx; }

    /**
     * Sets the zero-based graph index.
     * @param idx integer graph index.
     */
    public void setIdx(Integer idx) { this.idx = idx; }

    /**
     * Returns the precinct property bag (demographics, election results, etc.).
     * @return flexible key-value map of precinct attributes.
     */
    public Map<String,Object> getProps() { return props; }

    /**
     * Sets the precinct property bag.
     * @param props key-value map of precinct attributes.
     */
    public void setProps(Map<String,Object> props) { this.props = props; }

    /**
     * Returns the GeoJSON geometry map for this precinct.
     * @return map with {@code "type"} and {@code "coordinates"} keys.
     */
    public Map<String,Object> getGeometry() { return geometry; }

    /**
     * Sets the GeoJSON geometry map.
     * @param geometry map with {@code "type"} and {@code "coordinates"} keys.
     */
    public void setGeometry(Map<String,Object> geometry) { this.geometry = geometry; }
}
