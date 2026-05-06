package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.EffectivenessDoc;
import edu.stonybrook.cse416.backend.model.State;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface EffectivenessRepository extends MongoRepository<EffectivenessDoc, String> {
    Optional<EffectivenessDoc> findByStateId(State stateId);
}
