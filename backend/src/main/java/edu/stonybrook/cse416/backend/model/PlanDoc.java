package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "plans")
public class PlanDoc {

    @Id
    private String id;

    private String ensembleId;
    private Integer planIndex;
    private List<Integer> assignments;

    public PlanDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEnsembleId() { return ensembleId; }
    public void setEnsembleId(String ensembleId) { this.ensembleId = ensembleId; }

    public Integer getPlanIndex() { return planIndex; }
    public void setPlanIndex(Integer planIndex) { this.planIndex = planIndex; }

    public List<Integer> getAssignments() { return assignments; }
    public void setAssignments(List<Integer> assignments) { this.assignments = assignments; }
}