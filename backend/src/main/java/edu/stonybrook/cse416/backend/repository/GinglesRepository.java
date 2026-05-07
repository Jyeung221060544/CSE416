package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.GinglesDoc;
import edu.stonybrook.cse416.backend.model.State;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface GinglesRepository extends MongoRepository<GinglesDoc, String> {

    /**
     * Spring Data derives the Mongo query from this method name:
     * { stateId: ..., race: ... }.
     */
    Optional<GinglesDoc> findByStateIdAndRace(State stateId, String race);
}
