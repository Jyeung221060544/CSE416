package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.StateDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

/** Spring Data repository for the {@code states} collection. */
public interface StateRepository extends MongoRepository<StateDoc, String> {}
