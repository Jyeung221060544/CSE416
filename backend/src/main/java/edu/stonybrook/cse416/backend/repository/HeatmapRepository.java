package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.HeatmapDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/** Spring Data repository for the {@code heatmaps} collection. */
public interface HeatmapRepository extends MongoRepository<HeatmapDoc, String> {

    /**
     * Finds the heatmap document for a specific (state, race) pair.
     * Documents are stored one-per-race so the client fetches only the active
     * race layer.  The {@code _id} is deterministic:
     * {@code "{stateId}_{race}"} (e.g. {@code "AL_black"}).
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @param race    lowercase racial group key (e.g. "black")
     */
    Optional<HeatmapDoc> findByStateIdAndRace(String stateId, String race);
}
