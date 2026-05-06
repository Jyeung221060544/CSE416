package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.model.VoteSeatShareDoc;
import edu.stonybrook.cse416.backend.repository.VoteSeatShareRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * VoteSeatShareService — serves
 * {@code GET /api/states/{stateId}/vote-seat-share}.
 *
 * Cached under {@code "vote_seat_share"} keyed by {@code stateId}.
 */
@Service
public class VoteSeatShareService {

    private final VoteSeatShareRepository vsRepo;

    public VoteSeatShareService(VoteSeatShareRepository vsRepo) {
        this.vsRepo = vsRepo;
    }

    /**
     * Returns the vote-seat share document for the given state,
     * or {@code null} if not found.
     *
     * @param stateId 
     */
    @Cacheable(value = "vote_seat_share", key = "#stateId")
    public VoteSeatShareDoc getVoteSeatShare(State stateId) {
        Optional<VoteSeatShareDoc> opt = vsRepo.findByStateId(stateId);
        return opt.orElse(null);
    }
}
