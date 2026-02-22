package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Document(collection = "analytics")
public class AnalyticsDoc {

    @Id
    private String id;

    private String state;
    private String type;
    private Integer electionYear;
    private String demographicGroup;
    private String ensembleId;
    private String ensembleType;
    private String granularity;

    private Map<String,Object> payload;

    private Instant updatedAt;

    public AnalyticsDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Integer getElectionYear() { return electionYear; }
    public void setElectionYear(Integer electionYear) { this.electionYear = electionYear; }

    public String getDemographicGroup() { return demographicGroup; }
    public void setDemographicGroup(String demographicGroup) { this.demographicGroup = demographicGroup; }

    public String getEnsembleId() { return ensembleId; }
    public void setEnsembleId(String ensembleId) { this.ensembleId = ensembleId; }

    public String getEnsembleType() { return ensembleType; }
    public void setEnsembleType(String ensembleType) { this.ensembleType = ensembleType; }

    public String getGranularity() { return granularity; }
    public void setGranularity(String granularity) { this.granularity = granularity; }

    public Map<String,Object> getPayload() { return payload; }
    public void setPayload(Map<String,Object> payload) { this.payload = payload; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}