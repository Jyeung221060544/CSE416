package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.EiKdeDoc;
import edu.stonybrook.cse416.backend.model.State;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/** Spring Data repository for the {@code ei_kde} collection. */
public interface EiKdeRepository extends MongoRepository<EiKdeDoc, String> {
    Optional<EiKdeDoc> findByStateId(State stateId);
}
