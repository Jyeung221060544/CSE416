package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.VoteSeatShareDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

/** Spring Data repository for the {@code vote_seat_share} collection. */
public interface VoteSeatShareRepository extends MongoRepository<VoteSeatShareDoc, String> {}
