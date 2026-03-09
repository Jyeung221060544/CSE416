package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.HeatmapDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/** Spring Data repository for the {@code heatmaps} collection. */
public interface HeatmapRepository extends MongoRepository<HeatmapDoc, String> {

    /**
     * Finds the heatmap document for a specific (state, granularity, race) triple.
     * Documents are stored one-per-race so the client fetches only the active
     * race layer.  The {@code _id} is deterministic:
     * {@code "{stateId}_{granularity}_{race}"}.
     *
     * @param stateId     two-letter state abbreviation (e.g. "AL")
     * @param granularity "precinct" or "census_block"
     * @param race        lowercase racial group key (e.g. "black")
     */
    Optional<HeatmapDoc> findByStateIdAndGranularityAndRace(
            String stateId, String granularity, String race);
}
