package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.GinglesDoc;
import edu.stonybrook.cse416.backend.model.State;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/** Spring Data repository for the {@code gingles} collection. */
public interface GinglesRepository extends MongoRepository<GinglesDoc, String> {

    /**
     * Finds the Gingles document for a given state and racial group.
     *
     * @param stateId state enum value (e.g. State.AL)
     * @param race    lowercase racial group key (e.g. "black", "white")
     */
    Optional<GinglesDoc> findByStateIdAndRace(State stateId, String race);
}
