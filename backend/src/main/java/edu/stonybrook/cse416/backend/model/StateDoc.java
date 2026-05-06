package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

/**
 * StateDoc — MongoDB document model for the {@code states} collection.
 */
@Document(collection = "states")
public class StateDoc {

    @Id
    private String id; 
    private State stateId;
    private String name;
    private Boolean isPreclearance;
    private Integer numDistricts;
    private Map<String, Object> center;
    private Integer zoom;
    private Boolean hasData;
    private String precinctGeoPath;

    public StateDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public State getStateId() { return stateId; }
    public void setStateId(State stateId) { this.stateId = stateId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Boolean getIsPreclearance() { return isPreclearance; }
    public void setIsPreclearance(Boolean isPreclearance) { this.isPreclearance = isPreclearance; }

    public Integer getNumDistricts() { return numDistricts; }
    public void setNumDistricts(Integer numDistricts) { this.numDistricts = numDistricts; }

    public Map<String, Object> getCenter() { return center; }
    public void setCenter(Map<String, Object> center) { this.center = center; }

    public Integer getZoom() { return zoom; }
    public void setZoom(Integer zoom) { this.zoom = zoom; }

    public Boolean getHasData() { return hasData; }
    public void setHasData(Boolean hasData) { this.hasData = hasData; }

    public String getPrecinctGeoPath() { return precinctGeoPath; }
    public void setPrecinctGeoPath(String precinctGeoPath) { this.precinctGeoPath = precinctGeoPath; }
}
