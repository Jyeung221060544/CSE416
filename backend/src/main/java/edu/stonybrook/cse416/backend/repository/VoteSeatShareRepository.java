package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.model.VoteSeatShareDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;


public interface VoteSeatShareRepository extends MongoRepository<VoteSeatShareDoc, String> {
    Optional<VoteSeatShareDoc> findByStateId(State stateId);
}
