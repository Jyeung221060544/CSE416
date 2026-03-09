package edu.stonybrook.cse416.backend.loader;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import edu.stonybrook.cse416.backend.model.*;
import edu.stonybrook.cse416.backend.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.*;

/**
 * DataLoader — seeds all MongoDB collections from pre-computed JSON files.
 *
 * <p>Run once with {@code app.load-data=true} to populate the database, then
 * flip the flag back to {@code false} and restart normally.
 *
 * <pre>
 * ./mvnw spring-boot:run -Dspring-boot.run.arguments="--app.load-data=true"
 * </pre>
 *
 * <h2>Collections seeded</h2>
 * <ul>
 *   <li>{@code states}           — from {@code splash-states.json}</li>
 *   <li>{@code geo_assets}       — US-48 states outline + per-state district GeoJSONs;
 *                                  precinct GeoJSONs (~100+ MB) are served from disk,
 *                                  not stored here</li>
 *   <li>{@code state_overview}   — from AL-state-summary + AL-district-summary +
 *                                  AL-ensemble-summary + EI compare pairs manifest</li>
 *   <li>{@code heatmaps}         — from AL-heatmap-precinct + AL-heatmap-census;
 *                                  <b>one doc per (granularity, race)</b> — features
 *                                  contain only {@code {idx, binId}} for that race</li>
 *   <li>{@code ensemble_analysis}— from AL-splits + AL-boxwhisker</li>
 *   <li>{@code gingles}          — from AL-Gingles-precinct (one doc per feasible race)</li>
 *   <li>{@code ei_kde}           — from AL-EI (inverted: one doc per race)</li>
 *   <li>{@code ei_compare}       — from AL-EI-compare (one doc per race pair);
 *                                  pairs vary by state and what EI modelled</li>
 *   <li>{@code vote_seat_share}  — from AL-vote-seat-share</li>
 * </ul>
 *
 * <h2>Adding a new state</h2>
 * Add an entry to {@code splash-states.json} and drop the state's JSON files
 * into {@code frontend/src/dummy/}.  Then uncomment (or add) the matching
 * {@code seedState} call in {@link #loadAllStates}.
 */
@Component
public class DataLoader implements CommandLineRunner {

    @Value("${app.load-data:false}")
    private boolean loadData;

    @Value("${app.dummy-data.base-path:../frontend/src/dummy}")
    private String dummyBase;

    /** Root that contains AL_data/ and OR_data/ subdirectories. */
    @Value("${app.geodata.base-path:..}")
    private String geoBase;

    private final StateRepository              stateRepo;
    private final StateOverviewRepository      overviewRepo;
    private final HeatmapRepository            heatmapRepo;
    private final EnsembleAnalysisRepository   ensembleRepo;
    private final GinglesRepository            ginglesRepo;
    private final EiKdeRepository              eiKdeRepo;
    private final EiCompareRepository          eiCompareRepo;
    private final VoteSeatShareRepository      vsRepo;
    private final GeoAssetRepository           geoRepo;
    private final ObjectMapper                 mapper;

    public DataLoader(StateRepository stateRepo,
                      StateOverviewRepository overviewRepo,
                      HeatmapRepository heatmapRepo,
                      EnsembleAnalysisRepository ensembleRepo,
                      GinglesRepository ginglesRepo,
                      EiKdeRepository eiKdeRepo,
                      EiCompareRepository eiCompareRepo,
                      VoteSeatShareRepository vsRepo,
                      GeoAssetRepository geoRepo) {
        this.stateRepo     = stateRepo;
        this.overviewRepo  = overviewRepo;
        this.heatmapRepo   = heatmapRepo;
        this.ensembleRepo  = ensembleRepo;
        this.ginglesRepo   = ginglesRepo;
        this.eiKdeRepo     = eiKdeRepo;
        this.eiCompareRepo = eiCompareRepo;
        this.vsRepo        = vsRepo;
        this.geoRepo       = geoRepo;
        this.mapper        = new ObjectMapper();
    }

    // ── Entry point ───────────────────────────────────────────────────────────

    @Override
    public void run(String... args) throws Exception {
        if (!loadData) return;

        System.out.println("[DataLoader] Dropping existing collections...");
        stateRepo.deleteAll();
        overviewRepo.deleteAll();
        heatmapRepo.deleteAll();
        ensembleRepo.deleteAll();
        ginglesRepo.deleteAll();
        eiKdeRepo.deleteAll();
        eiCompareRepo.deleteAll();
        vsRepo.deleteAll();
        geoRepo.deleteAll();

        loadStates();
        loadGeoAssets();
        loadAllStates();

        System.out.println("[DataLoader] Seed complete.");
    }

    // ── States collection ─────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void loadStates() throws Exception {
        Map<String, Object> root = read("splash-states.json");
        List<Map<String, Object>> list = (List<Map<String, Object>>) root.get("states");
        for (Map<String, Object> s : list) {
            StateDoc doc = new StateDoc();
            doc.setId((String) s.get("stateId"));
            doc.setName((String) s.get("stateName"));
            doc.setHasData((Boolean) s.get("hasData"));
            doc.setNumDistricts((Integer) s.get("numDistricts"));
            doc.setIsPreclearance((Boolean) s.get("isPreclearance"));
            doc.setCenter((Map<String, Object>) s.get("center"));
            doc.setZoom((Integer) s.get("zoom"));
            stateRepo.save(doc);
            System.out.println("[DataLoader] states: saved " + doc.getId());
        }
    }

    // ── GeoJSON assets (US-48 + district boundaries) ─────────────────────────

    /**
     * Seeds the {@code geo_assets} collection with:
     * <ul>
     *   <li>US 48 contiguous states outline (from {@code frontend/src/assets/})</li>
     *   <li>Congressional district GeoJSON for each state (from {@code {STATE}_data/})</li>
     * </ul>
     *
     * <p>Precinct GeoJSONs are NOT seeded here — they are streamed from disk
     * by {@code PrecinctGeoController} because they exceed MongoDB's 16 MB
     * document limit.
     */
    private void loadGeoAssets() throws Exception {
        // US-48 states outline — lives in the frontend assets folder
        File usStatesFile = new File(geoBase, "frontend/src/assets/US-48-States.geojson");
        if (usStatesFile.exists()) {
            Map<String, Object> geojson = mapper.readValue(usStatesFile, mapType());
            GeoAssetDoc doc = new GeoAssetDoc();
            doc.setId("us_states");
            doc.setGeojson(geojson);
            geoRepo.save(doc);
            System.out.println("[DataLoader] geo_assets: saved us_states");
        } else {
            System.out.println("[DataLoader] geo_assets: US-48-States.geojson not found at "
                    + usStatesFile.getAbsolutePath() + ", skipping");
        }

        // Congressional district boundaries per state
        loadDistrictGeo("AL");
        loadDistrictGeo("OR");
    }

    /**
     * Seeds the district GeoJSON for one state from
     * {@code {geoBase}/{STATE}_data/{STATE}_enacted_districts_with_stats.geojson}.
     */
    private void loadDistrictGeo(String state) throws Exception {
        File file = new File(geoBase,
                state + "_data/" + state + "_enacted_districts_with_stats.geojson");
        if (!file.exists()) {
            System.out.println("[DataLoader] geo_assets: district file not found for "
                    + state + " at " + file.getAbsolutePath() + ", skipping");
            return;
        }
        Map<String, Object> geojson = mapper.readValue(file, mapType());
        GeoAssetDoc doc = new GeoAssetDoc();
        doc.setId(state + "_districts");
        doc.setGeojson(geojson);
        geoRepo.save(doc);
        System.out.println("[DataLoader] geo_assets: saved " + state + "_districts");
    }

    // ── Per-state seeding ─────────────────────────────────────────────────────

    /**
     * Seeds all per-state collections.  EI-compare is seeded first so that the
     * available pairs manifest can be embedded in the overview document.
     */
    private void loadAllStates() throws Exception {
        seedState("AL");
        // seedState("OR");  // uncomment when OR analytics JSON files are added to frontend/src/dummy/
    }

    private void seedState(String state) throws Exception {
        System.out.println("[DataLoader] Seeding state: " + state);
        // EI compare first — returns the pairs manifest for embedding in overview
        List<List<String>> eiPairs = loadEiCompare(state);
        // Heatmaps second — discovers available races dynamically from data keys
        List<String> heatmapRaces = loadHeatmaps(state);
        loadOverview(state, eiPairs, heatmapRaces);
        loadEnsemble(state);
        loadGingles(state);
        loadEiKde(state);
        loadVoteSeatShare(state);
    }

    // ── state_overview ────────────────────────────────────────────────────────

    /**
     * Seeds the overview document.
     *
     * @param eiPairs      list of available EI-compare race pairs for this state —
     *                     varies by state depending on what races were modelled.
     *                     Each entry is a sorted two-element list, e.g. ["black","white"].
     * @param heatmapRaces races discovered from heatmap feature keys — varies by state.
     *                     Frontend uses this list to know which {@code race} values are
     *                     valid for {@code GET /heatmap?race=} requests.
     */
    private void loadOverview(String state, List<List<String>> eiPairs,
                              List<String> heatmapRaces) throws Exception {
        String prefix = state + "-";
        Map<String, Object> stateSummary    = readIfExists(prefix + "state-summary.json");
        Map<String, Object> districtSummary = readIfExists(prefix + "district-summary.json");
        Map<String, Object> ensembleSummary = readIfExists(prefix + "ensemble-summary.json");

        if (stateSummary == null && districtSummary == null && ensembleSummary == null) {
            System.out.println("[DataLoader] state_overview: no files found for " + state + ", skipping");
            return;
        }

        StateOverviewDoc doc = new StateOverviewDoc();
        doc.setId(state);
        doc.setStateSummary(stateSummary);
        doc.setDistrictSummary(districtSummary);
        doc.setEnsembleSummary(ensembleSummary);
        doc.setAvailableHeatmapRaces(heatmapRaces.isEmpty() ? null : heatmapRaces);
        doc.setAvailableEiComparePairs(eiPairs.isEmpty() ? null : eiPairs);
        overviewRepo.save(doc);
        System.out.println("[DataLoader] state_overview: saved " + state
                + " (" + heatmapRaces.size() + " heatmap races, "
                + eiPairs.size() + " EI compare pairs)");
    }

    // ── heatmaps (one doc per granularity × race) ─────────────────────────────

    /**
     * Seeds heatmap documents for all granularities and returns the union of race
     * keys discovered across all files.  Races are discovered dynamically from the
     * feature map keys rather than a hardcoded list, so adding a new racial group
     * to the source JSON requires no code change.
     *
     * @return de-duplicated, ordered list of race keys found (e.g. ["black","white"])
     */
    private List<String> loadHeatmaps(String state) throws Exception {
        // LinkedHashSet preserves insertion order and de-duplicates across granularities
        Set<String> raceSet = new LinkedHashSet<>();
        raceSet.addAll(loadHeatmapGranularity(state, "precinct",     state + "-heatmap-precinct.json"));
        raceSet.addAll(loadHeatmapGranularity(state, "census_block", state + "-heatmap-census.json"));
        return new ArrayList<>(raceSet);
    }

    /**
     * Reads one heatmap JSON file, discovers available races from the feature keys,
     * and writes a separate HeatmapDoc for each discovered race.
     *
     * <p>The source format stores all races per feature:
     * <pre>features: [{ idx, black, white, hispanic, asian, other }]</pre>
     *
     * <p>Each output document contains only the selected race's bin assignment:
     * <pre>features: [{ idx, binId }]</pre>
     *
     * <p>Races are discovered at seed time by inspecting the first feature entry's
     * key set (all keys except {@code "idx"}).  This means adding a new racial
     * group to the source JSON requires no code change.
     *
     * @return list of race keys discovered in this file, or empty list if the file
     *         was not found
     */
    @SuppressWarnings("unchecked")
    private List<String> loadHeatmapGranularity(String state, String granularity, String filename)
            throws Exception {
        Map<String, Object> raw = readIfExists(filename);
        if (raw == null) {
            System.out.println("[DataLoader] heatmaps: " + filename + " not found, skipping");
            return Collections.emptyList();
        }

        List<Map<String, Object>> bins     = (List<Map<String, Object>>) raw.get("bins");
        List<Map<String, Object>> features = (List<Map<String, Object>>) raw.get("features");

        // Discover races from the first feature's key set — every key except "idx" is a race.
        List<String> discoveredRaces = new ArrayList<>();
        if (features != null && !features.isEmpty()) {
            for (String key : features.get(0).keySet()) {
                if (!key.equals("idx")) discoveredRaces.add(key);
            }
        }

        for (String race : discoveredRaces) {
            // Slice features to {idx, binId} for this race only
            List<Map<String, Object>> raceFeatures = new ArrayList<>(features.size());
            for (Map<String, Object> f : features) {
                if (!f.containsKey(race)) continue; // race absent for this unit — skip
                Map<String, Object> slim = new LinkedHashMap<>();
                slim.put("idx",   f.get("idx"));
                slim.put("binId", f.get(race));
                raceFeatures.add(slim);
            }

            HeatmapDoc doc = new HeatmapDoc();
            doc.setId(state + "_" + granularity + "_" + race);
            doc.setStateId(state);
            doc.setGranularity(granularity);
            doc.setRace(race);
            doc.setBins(bins);
            doc.setFeatures(raceFeatures);
            heatmapRepo.save(doc);
            System.out.println("[DataLoader] heatmaps: saved " + doc.getId()
                    + " (" + raceFeatures.size() + " features)");
        }

        return discoveredRaces;
    }

    // ── ensemble_analysis ─────────────────────────────────────────────────────

    private void loadEnsemble(String state) throws Exception {
        String prefix = state + "-";
        Map<String, Object> splits     = readIfExists(prefix + "splits.json");
        Map<String, Object> boxWhisker = readIfExists(prefix + "boxwhisker.json");

        if (splits == null && boxWhisker == null) {
            System.out.println("[DataLoader] ensemble_analysis: no files found for " + state + ", skipping");
            return;
        }

        EnsembleAnalysisDoc doc = new EnsembleAnalysisDoc();
        doc.setId(state);
        doc.setSplits(splits);
        doc.setBoxWhisker(boxWhisker);
        ensembleRepo.save(doc);
        System.out.println("[DataLoader] ensemble_analysis: saved " + state);
    }

    // ── gingles (one doc per feasible race) ───────────────────────────────────

    @SuppressWarnings("unchecked")
    private void loadGingles(String state) throws Exception {
        Map<String, Object> raw = readIfExists(state + "-Gingles-precinct.json");
        if (raw == null) {
            System.out.println("[DataLoader] gingles: file not found for " + state + ", skipping");
            return;
        }

        Map<String, Object> seriesByRace =
                (Map<String, Object>) raw.get("feasibleSeriesByRace");
        if (seriesByRace == null) return;

        for (Map.Entry<String, Object> entry : seriesByRace.entrySet()) {
            String race = entry.getKey().toLowerCase();
            Map<String, Object> series = (Map<String, Object>) entry.getValue();

            GinglesDoc doc = new GinglesDoc();
            doc.setId(state + "_" + race);
            doc.setStateId(state);
            doc.setRace(race);
            doc.setPoints((List<Map<String, Object>>) series.get("points"));
            doc.setDemocraticTrendline((List<Map<String, Object>>) series.get("democraticTrendline"));
            doc.setRepublicanTrendline((List<Map<String, Object>>) series.get("republicanTrendline"));
            doc.setSummaryRows((List<Map<String, Object>>) series.get("summaryRows"));
            ginglesRepo.save(doc);
            System.out.println("[DataLoader] gingles: saved " + doc.getId());
        }
    }

    // ── ei_kde (inverted: one doc per race, all candidates) ───────────────────

    @SuppressWarnings("unchecked")
    private void loadEiKde(String state) throws Exception {
        Map<String, Object> raw = readIfExists(state + "-EI.json");
        if (raw == null) {
            System.out.println("[DataLoader] ei_kde: file not found for " + state + ", skipping");
            return;
        }

        Integer electionYear = (Integer) raw.get("electionYear");
        List<Map<String, Object>> candidates =
                (List<Map<String, Object>>) raw.get("candidates");

        // Source is candidate-first: candidates[].racialGroups[].{group, kdePoints, ...}
        // Invert to race-first: race → [{candidateId, candidateName, party, kdePoints, ...}]
        // This allows the client to fetch exactly one race's KDE curves per request.
        Map<String, List<Map<String, Object>>> raceMap = new LinkedHashMap<>();

        for (Map<String, Object> candidate : candidates) {
            String candidateId   = (String) candidate.get("candidateId");
            String candidateName = (String) candidate.get("candidateName");
            String party         = (String) candidate.get("party");

            List<Map<String, Object>> racialGroups =
                    (List<Map<String, Object>>) candidate.get("racialGroups");

            for (Map<String, Object> rg : racialGroups) {
                String raceKey = ((String) rg.get("group")).toLowerCase();

                Map<String, Object> candidateSlice = new LinkedHashMap<>();
                candidateSlice.put("candidateId",            candidateId);
                candidateSlice.put("candidateName",          candidateName);
                candidateSlice.put("party",                  party);
                candidateSlice.put("peakSupportEstimate",    rg.get("peakSupportEstimate"));
                candidateSlice.put("confidenceIntervalLow",  rg.get("confidenceIntervalLow"));
                candidateSlice.put("confidenceIntervalHigh", rg.get("confidenceIntervalHigh"));
                candidateSlice.put("kdePoints",              rg.get("kdePoints"));

                raceMap.computeIfAbsent(raceKey, k -> new ArrayList<>()).add(candidateSlice);
            }
        }

        for (Map.Entry<String, List<Map<String, Object>>> entry : raceMap.entrySet()) {
            String raceKey = entry.getKey();
            EiKdeDoc doc = new EiKdeDoc();
            doc.setId(state + "_ei_" + raceKey);
            doc.setStateId(state);
            doc.setRace(raceKey);
            doc.setElectionYear(electionYear);
            doc.setCandidates(entry.getValue());
            eiKdeRepo.save(doc);
            System.out.println("[DataLoader] ei_kde: saved " + doc.getId());
        }
    }

    // ── ei_compare (one doc per race pair) ────────────────────────────────────

    /**
     * Seeds EI-compare documents — one per race pair found in the source file.
     *
     * <p>The number of pairs varies by state: a state with only 2 modelled races
     * produces 1 pair; a state with 5 produces up to C(5,2) = 10 pairs.
     * Only pairs actually present in the data file are seeded; missing pairs
     * return 404 when requested, and the frontend uses the pairs manifest from
     * the overview endpoint to avoid requesting pairs that don't exist.
     *
     * @return sorted list of available race pairs for embedding in the overview doc
     */
    @SuppressWarnings("unchecked")
    private List<List<String>> loadEiCompare(String state) throws Exception {
        List<List<String>> pairsManifest = new ArrayList<>();

        Map<String, Object> raw = readIfExists(state + "-EI-compare.json");
        if (raw == null) {
            System.out.println("[DataLoader] ei_compare: file not found for " + state + ", skipping");
            return pairsManifest;
        }

        Integer electionYear  = (Integer) raw.get("electionYear");
        Double  diffThreshold = toDouble(raw.get("differenceThreshold"));
        List<Map<String, Object>> racePairs =
                (List<Map<String, Object>>) raw.get("racePairs");

        for (Map<String, Object> pair : racePairs) {
            List<String> races = (List<String>) pair.get("races");
            if (races == null || races.size() < 2) continue;

            // Sort alphabetically for a deterministic _id regardless of source order.
            String[] sorted = { races.get(0).toLowerCase(), races.get(1).toLowerCase() };
            Arrays.sort(sorted);

            EiCompareDoc doc = new EiCompareDoc();
            doc.setId(state + "_eicompare_" + sorted[0] + "_" + sorted[1]);
            doc.setStateId(state);
            doc.setRaces(Arrays.asList(sorted));
            doc.setLabel((String) pair.get("label"));
            doc.setElectionYear(electionYear);
            doc.setDifferenceThreshold(diffThreshold);
            doc.setCandidates((List<Map<String, Object>>) pair.get("candidates"));
            eiCompareRepo.save(doc);
            System.out.println("[DataLoader] ei_compare: saved " + doc.getId());

            pairsManifest.add(Arrays.asList(sorted));
        }

        return pairsManifest;
    }

    // ── vote_seat_share ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void loadVoteSeatShare(String state) throws Exception {
        Map<String, Object> raw = readIfExists(state + "-vote-seat-share.json");
        if (raw == null) {
            System.out.println("[DataLoader] vote_seat_share: file not found for " + state + ", skipping");
            return;
        }

        VoteSeatShareDoc doc = new VoteSeatShareDoc();
        doc.setId(state);
        doc.setStateId(state);
        doc.setElectionYear((Integer) raw.get("electionYear"));
        doc.setRaciallyPolarized((Boolean) raw.get("raciallyPolarized"));
        doc.setTotalDistricts((Integer) raw.get("totalDistricts"));
        doc.setPartisanBias(toDouble(raw.get("partisanBias")));
        doc.setCurves((List<Map<String, Object>>) raw.get("curves"));
        doc.setEnactedPlan((Map<String, Object>) raw.get("enactedPlan"));
        vsRepo.save(doc);
        System.out.println("[DataLoader] vote_seat_share: saved " + state);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Reads a JSON file from the dummy base path. */
    private Map<String, Object> read(String filename) throws Exception {
        return mapper.readValue(new File(dummyBase, filename), mapType());
    }

    /**
     * Like {@link #read} but returns {@code null} if the file does not exist,
     * allowing partial seeding when some data files are not yet available.
     */
    private Map<String, Object> readIfExists(String filename) throws Exception {
        File f = new File(dummyBase, filename);
        if (!f.exists()) return null;
        return mapper.readValue(f, mapType());
    }

    /** Safely converts a JSON number (Integer or Double) to Double. */
    private Double toDouble(Object val) {
        if (val == null) return null;
        return ((Number) val).doubleValue();
    }

    private TypeReference<Map<String, Object>> mapType() {
        return new TypeReference<>() {};
    }
}
