package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.EiCompareDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/** Spring Data repository for the {@code ei_compare} collection. */
public interface EiCompareRepository extends MongoRepository<EiCompareDoc, String> {

    /**
     * Finds the EI-compare document by its deterministic composite ID.
     * The ID is {@code "{stateId}_eicompare_{race1}_{race2}"} with races sorted
     * alphabetically at seed time.
     *
     * @param id pre-built composite key
     */
    Optional<EiCompareDoc> findById(String id);
}
