package edu.stonybrook.cse416.backend.model;

/**
 * State — enumeration of US states available for redistricting analysis.
 *
 * <p>Serializes to/from its name string (e.g. {@code "AL"}, {@code "OR"}) in
 * both MongoDB documents and JSON API responses, so external data formats are
 * unchanged by this type.
 */
public enum State {
    AL,
    OR
}
