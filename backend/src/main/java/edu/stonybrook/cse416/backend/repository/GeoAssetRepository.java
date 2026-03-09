package edu.stonybrook.cse416.backend.repository;

import edu.stonybrook.cse416.backend.model.GeoAssetDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GeoAssetRepository extends MongoRepository<GeoAssetDoc, String> {}
