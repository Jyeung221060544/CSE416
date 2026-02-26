package edu.stonybrook.cse416.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * BackendApplication — Spring Boot entry point for the CSE 416 redistricting
 * analysis server.
 *
 * <p>Annotated with {@code @SpringBootApplication}, which enables:
 * <ul>
 *   <li>Auto-configuration of Spring components (MongoDB, MVC, etc.)</li>
 *   <li>Component scanning of all classes in the {@code edu.stonybrook.cse416.backend}
 *       package and its sub-packages.</li>
 * </ul>
 *
 * <p>Run this class's {@link #main(String[])} method to start the embedded
 * Tomcat server on the configured port (default: 8080).
 */
@SpringBootApplication
public class BackendApplication {

	/**
	 * Application entry point. Delegates immediately to Spring Boot's
	 * {@link SpringApplication#run(Class, String[])} to bootstrap the
	 * application context and start the embedded web server.
	 *
	 * @param args Command-line arguments forwarded to Spring Boot
	 *             (e.g. {@code --server.port=9090}).
	 */
	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}
