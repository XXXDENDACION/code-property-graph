package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"cpg-explorer/db"

	"github.com/gorilla/mux"
)

type Handler struct {
	db *db.DB
}

func New(database *db.DB) *Handler {
	return &Handler{db: database}
}

func (h *Handler) respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func (h *Handler) GetPackages(w http.ResponseWriter, r *http.Request) {
	packages, err := h.db.GetPackages()
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, packages)
}

func (h *Handler) GetPackageGraph(w http.ResponseWriter, r *http.Request) {
	graph, err := h.db.GetPackageGraph()
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, graph)
}

func (h *Handler) GetPackageFunctions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pkg := vars["name"]

	functions, err := h.db.GetFunctionsInPackage(pkg)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, functions)
}

func (h *Handler) GetCallGraph(w http.ResponseWriter, r *http.Request) {
	funcID := r.URL.Query().Get("id")
	if funcID == "" {
		h.respondError(w, http.StatusBadRequest, "id parameter required")
		return
	}

	depth := 2
	if d := r.URL.Query().Get("depth"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil {
			depth = parsed
		}
	}

	direction := r.URL.Query().Get("direction")
	var graph *db.Graph
	var err error

	if direction == "callers" {
		graph, err = h.db.GetCallersGraph(funcID, depth)
	} else {
		graph, err = h.db.GetCallGraph(funcID, depth)
	}

	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, graph)
}

func (h *Handler) GetSource(w http.ResponseWriter, r *http.Request) {
	funcID := r.URL.Query().Get("id")
	if funcID == "" {
		h.respondError(w, http.StatusBadRequest, "id parameter required")
		return
	}

	source, err := h.db.GetSource(funcID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, map[string]string{"source": source})
}

func (h *Handler) GetSourceByFile(w http.ResponseWriter, r *http.Request) {
	file := r.URL.Query().Get("file")
	if file == "" {
		h.respondError(w, http.StatusBadRequest, "file parameter required")
		return
	}

	source, err := h.db.GetSourceByFile(file)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, map[string]string{"source": source, "file": file})
}

func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		h.respondJSON(w, []db.SearchResult{})
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	results, err := h.db.Search(query, limit)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, results)
}

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.db.GetStats()
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, stats)
}

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, map[string]string{"status": "ok"})
}
