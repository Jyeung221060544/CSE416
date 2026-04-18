package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.model.StateOverviewDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/** Spring Data repository for the {@code state_overview} collection. */
public interface StateOverviewRepository extends MongoRepository<StateOverviewDoc, String> {
    Optional<StateOverviewDoc> findByStateId(State stateId);
}
