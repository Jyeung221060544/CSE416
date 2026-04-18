package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.EnsembleDoc;
import edu.stonybrook.cse416.backend.model.State;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/** Spring Data repository for the {@code ensemble_analysis} collection. */
public interface EnsembleRepository extends MongoRepository<EnsembleDoc, String> {
    Optional<EnsembleDoc> findByStateId(State stateId);
}
