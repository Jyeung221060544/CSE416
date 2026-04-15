package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.EffectivenessDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * EffectivenessRepository — Spring Data repository for the {@code effectiveness} collection.
 *
 * <p>Inherits {@code findById(String stateId)}, {@code save()}, and {@code deleteAll()}
 * from {@link MongoRepository}.  No custom query methods are needed — the entire
 * document is always retrieved and race filtering is done on the frontend.
 */
public interface EffectivenessRepository extends MongoRepository<EffectivenessDoc, String> {}
