package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.model.StateDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/** Spring Data repository for the {@code states} collection. */
public interface StateRepository extends MongoRepository<StateDoc, String> {
    Optional<StateDoc> findByStateId(State stateId);
}
