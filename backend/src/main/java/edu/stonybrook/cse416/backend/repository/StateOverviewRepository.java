package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.StateOverviewDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

/** Spring Data repository for the {@code state_overview} collection. */
public interface StateOverviewRepository extends MongoRepository<StateOverviewDoc, String> {}
