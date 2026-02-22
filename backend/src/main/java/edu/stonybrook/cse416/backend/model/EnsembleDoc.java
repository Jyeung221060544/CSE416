package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "ensembles")
public class EnsembleDoc {

    @Id
    private String ensembleId;

    private String state;
    private String ensembleType;
    private Integer numPlans;
    private Double populationEqualityThreshold;
    private String description;

    public EnsembleDoc() {}

    public String getEnsembleId() { return ensembleId; }
    public void setEnsembleId(String ensembleId) { this.ensembleId = ensembleId; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getEnsembleType() { return ensembleType; }
    public void setEnsembleType(String ensembleType) { this.ensembleType = ensembleType; }

    public Integer getNumPlans() { return numPlans; }
    public void setNumPlans(Integer numPlans) { this.numPlans = numPlans; }

    public Double getPopulationEqualityThreshold() { return populationEqualityThreshold; }
    public void setPopulationEqualityThreshold(Double populationEqualityThreshold) { this.populationEqualityThreshold = populationEqualityThreshold; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}