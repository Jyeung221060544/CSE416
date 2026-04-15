package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.EiKdeDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Spring Data repository for the {@code ei_kde} collection.
 * One document per state; uses inherited {@code findById(stateId)}.
 */
public interface EiKdeRepository extends MongoRepository<EiKdeDoc, String> {}
