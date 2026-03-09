package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.StateDoc;
import edu.stonybrook.cse416.backend.repository.StateRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * StateService — serves the {@code GET /api/states} splash-page endpoint.
 *
 * <p>Cached under {@code "states"} (Caffeine, 24 h TTL).  The list rarely
 * changes between restarts, so a single cache entry covers all clients.
 */
@Service
public class StateService {

    private final StateRepository stateRepo;

    public StateService(StateRepository stateRepo) {
        this.stateRepo = stateRepo;
    }

    /**
     * Returns the list of all states with splash-page metadata.
     *
     * <p>Response shape:
     * <pre>{ "states": [ { stateId, stateName, hasData, numDistricts,
     *                      isPreclearance, center, zoom } ] }</pre>
     */
    @Cacheable("states")
    public Map<String, Object> listStates() {
        List<StateDoc> docs = stateRepo.findAll();
        List<Map<String, Object>> items = new ArrayList<>(docs.size());

        for (StateDoc d : docs) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("stateId",        d.getId());
            entry.put("stateName",      d.getName());
            entry.put("hasData",        d.getHasData());
            entry.put("numDistricts",   d.getNumDistricts());
            entry.put("isPreclearance", d.getIsPreclearance());
            entry.put("center",         d.getCenter());
            entry.put("zoom",           d.getZoom());
            items.add(entry);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("states", items);
        return result;
    }
}
