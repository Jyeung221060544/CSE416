package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.EnsembleAnalysisDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

/** Spring Data repository for the {@code ensemble_analysis} collection. */
public interface EnsembleAnalysisRepository extends MongoRepository<EnsembleAnalysisDoc, String> {}
