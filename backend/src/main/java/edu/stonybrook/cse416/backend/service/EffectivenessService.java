package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.EffectivenessDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.repository.EffectivenessRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * EffectivenessService — serves the effectiveness analysis endpoint:
 *   {@code GET /api/states/{stateId}/ensemble/effectiveness}
 */
@Service
public class EffectivenessService {

    private final EffectivenessRepository effectivenessRepo;

    public EffectivenessService(EffectivenessRepository effectivenessRepo) {
        this.effectivenessRepo = effectivenessRepo;
    }

    /**
     * Returns the full effectiveness payload for the given state, or
     * {@code null} if no data exists (controller returns 404 in that case).
     *
     * The response shape matches the source JSON exactly so the frontend
     * can use it without transformation:
     * {@code
     * {
     *   "stateId":                 "AL",
     *   "numDistricts":            7,
     *   "totalPlans":              5000,
     *   "feasibleGroups":          ["black"],
     *   "effectivenessHistogram":  { ... },
     *   "effectivenessBoxWhisker": { ... },
     *   "vraImpactThreshold":      { "black": { "rows": [...] } }
     * }
     * }
     */
    @Cacheable(value = "effectiveness", key = "#stateId")
    public Map<String, Object> getEffectiveness(State stateId) {
        Optional<EffectivenessDoc> opt = effectivenessRepo.findByStateId(stateId);
        if (opt.isEmpty()) return null;

        EffectivenessDoc doc = opt.get();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("stateId",                 doc.getId());
        result.put("numDistricts",            doc.getNumDistricts());
        result.put("totalPlans",              doc.getTotalPlans());
        result.put("feasibleGroups",          doc.getFeasibleGroups());
        result.put("effectivenessHistogram",  doc.getHistogram());
        result.put("effectivenessBoxWhisker", doc.getBoxWhisker());
        result.put("vraImpactThreshold",      doc.getVraImpactThreshold());
        return result;
    }
}
