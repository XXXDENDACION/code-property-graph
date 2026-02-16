package main

import (
	"log"
	"net/http"
	"os"

	"cpg-explorer/db"
	"cpg-explorer/handlers"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	dbPath := os.Getenv("CPG_DB_PATH")
	if dbPath == "" {
		dbPath = "/data/cpg.db"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Opening database: %s", dbPath)
	database, err := db.Open(dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer database.Close()

	h := handlers.New(database)

	r := mux.NewRouter()

	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", h.HealthCheck).Methods("GET")
	api.HandleFunc("/stats", h.GetStats).Methods("GET")
	api.HandleFunc("/packages", h.GetPackages).Methods("GET")
	api.HandleFunc("/packages/graph", h.GetPackageGraph).Methods("GET")
	api.HandleFunc("/packages/{name}/functions", h.GetPackageFunctions).Methods("GET")
	api.HandleFunc("/functions/{id}/callgraph", h.GetCallGraph).Methods("GET")
	api.HandleFunc("/functions/{id}/source", h.GetSource).Methods("GET")
	api.HandleFunc("/source", h.GetSourceByFile).Methods("GET")
	api.HandleFunc("/search", h.Search).Methods("GET")

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	log.Printf("Starting server on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
