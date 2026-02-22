package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Document(collection = "precincts")
public class PrecinctDoc {

    @Id
    private String id;

    private String state;
    private String geoid;
    private Integer idx;

    private Map<String,Object> props;
    private Map<String,Object> geometry;

    public PrecinctDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getGeoid() { return geoid; }
    public void setGeoid(String geoid) { this.geoid = geoid; }

    public Integer getIdx() { return idx; }
    public void setIdx(Integer idx) { this.idx = idx; }

    public Map<String,Object> getProps() { return props; }
    public void setProps(Map<String,Object> props) { this.props = props; }

    public Map<String,Object> getGeometry() { return geometry; }
    public void setGeometry(Map<String,Object> geometry) { this.geometry = geometry; }
}