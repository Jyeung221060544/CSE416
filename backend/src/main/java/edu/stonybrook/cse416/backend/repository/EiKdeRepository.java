package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.EiKdeDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/** Spring Data repository for the {@code ei_kde} collection. */
public interface EiKdeRepository extends MongoRepository<EiKdeDoc, String> {

    /**
     * Finds the EI KDE document for a given state and racial group.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @param race    racial group key as stored (case may vary, e.g. "Black")
     */
    Optional<EiKdeDoc> findByStateIdAndRaceIgnoreCase(String stateId, String race);
}
