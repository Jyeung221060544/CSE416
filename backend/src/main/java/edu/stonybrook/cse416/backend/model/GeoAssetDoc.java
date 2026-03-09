package edu.stonybrook.cse416.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

/**
 * GeoAssetDoc — MongoDB document for the {@code geo_assets} collection.
 *
 * <p>Stores GeoJSON FeatureCollections that are small enough to fit within
 * MongoDB's 16 MB document limit:
 * <ul>
 *   <li>{@code _id = "us_states"} — the 48 contiguous US states (~414 KB)</li>
 *   <li>{@code _id = "AL_districts"} — AL congressional districts (~2.4 MB)</li>
 *   <li>{@code _id = "OR_districts"} — OR congressional districts (~3.7 MB)</li>
 * </ul>
 *
 * <p>Precinct GeoJSONs (~124 MB geometry) are NOT stored here — they are
 * streamed directly from disk by {@code PrecinctGeoController}.
 */
@Document(collection = "geo_assets")
public class GeoAssetDoc {

    @Id
    private String id;

    /** The raw GeoJSON FeatureCollection. */
    private Map<String, Object> geojson;

    public GeoAssetDoc() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Map<String, Object> getGeojson() { return geojson; }
    public void setGeojson(Map<String, Object> geojson) { this.geojson = geojson; }
}
