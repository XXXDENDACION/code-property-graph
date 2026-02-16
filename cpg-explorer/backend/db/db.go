package db

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

type Node struct {
	ID       string            `json:"id"`
	Kind     string            `json:"kind"`
	Name     string            `json:"name"`
	File     string            `json:"file,omitempty"`
	Line     int               `json:"line,omitempty"`
	Package  string            `json:"package,omitempty"`
	TypeInfo string            `json:"typeInfo,omitempty"`
	Props    map[string]string `json:"props,omitempty"`
}

type Edge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Kind   string `json:"kind"`
}

type Graph struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

type Package struct {
	Name       string `json:"name"`
	Module     string `json:"module,omitempty"`
	FileCount  int    `json:"fileCount"`
	FuncCount  int    `json:"funcCount"`
	Complexity int    `json:"complexity,omitempty"`
}

type SearchResult struct {
	ID      string `json:"id"`
	Kind    string `json:"kind"`
	Name    string `json:"name"`
	Package string `json:"package,omitempty"`
	File    string `json:"file,omitempty"`
	Line    int    `json:"line,omitempty"`
}

type FunctionMetrics struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Package    string `json:"package"`
	File       string `json:"file"`
	Line       int    `json:"line"`
	Complexity int    `json:"complexity"`
	LOC        int    `json:"loc"`
	Parameters int    `json:"parameters"`
	FanIn      int    `json:"fanIn"`
	FanOut     int    `json:"fanOut"`
}

type Hotspot struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Package    string `json:"package"`
	File       string `json:"file"`
	Line       int    `json:"line"`
	Complexity int    `json:"complexity"`
	LOC        int    `json:"loc"`
	FanIn      int    `json:"fanIn"`
	FanOut     int    `json:"fanOut"`
	Score      int    `json:"score"`
}

type Finding struct {
	ID       string `json:"id"`
	Category string `json:"category"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
	File     string `json:"file"`
	Line     int    `json:"line"`
}

func Open(path string) (*DB, error) {
	conn, err := sql.Open("sqlite", path+"?mode=ro")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}
	conn.SetMaxOpenConns(10)
	conn.SetMaxIdleConns(5)
	return &DB{conn: conn}, nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) GetPackages() ([]Package, error) {
	query := `
		SELECT
			n.package,
			COUNT(DISTINCT n.file) as file_count,
			COUNT(CASE WHEN n.kind = 'function' THEN 1 END) as func_count
		FROM nodes n
		WHERE n.package != ''
		GROUP BY n.package
		ORDER BY func_count DESC
		LIMIT 200
	`
	rows, err := db.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var packages []Package
	for rows.Next() {
		var p Package
		if err := rows.Scan(&p.Name, &p.FileCount, &p.FuncCount); err != nil {
			return nil, err
		}
		packages = append(packages, p)
	}
	return packages, nil
}

func (db *DB) GetPackageGraph() (*Graph, error) {
	nodesQuery := `
		SELECT DISTINCT package
		FROM nodes
		WHERE package != '' AND kind = 'function'
		LIMIT 200
	`
	rows, err := db.conn.Query(nodesQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	graph := &Graph{Nodes: []Node{}, Edges: []Edge{}}
	pkgSet := make(map[string]bool)

	for rows.Next() {
		var pkg string
		if err := rows.Scan(&pkg); err != nil {
			return nil, err
		}
		if !pkgSet[pkg] {
			pkgSet[pkg] = true
			graph.Nodes = append(graph.Nodes, Node{
				ID:      pkg,
				Kind:    "package",
				Name:    pkg,
			})
		}
	}

	edgesQuery := `
		SELECT DISTINCT
			src.package as source_pkg,
			tgt.package as target_pkg
		FROM edges e
		JOIN nodes src ON e.source = src.id
		JOIN nodes tgt ON e.target = tgt.id
		WHERE e.kind = 'call'
			AND src.package != ''
			AND tgt.package != ''
			AND src.package != tgt.package
		LIMIT 500
	`
	edgeRows, err := db.conn.Query(edgesQuery)
	if err != nil {
		return nil, err
	}
	defer edgeRows.Close()

	edgeSet := make(map[string]bool)
	for edgeRows.Next() {
		var source, target string
		if err := edgeRows.Scan(&source, &target); err != nil {
			return nil, err
		}
		key := source + "->" + target
		if !edgeSet[key] && pkgSet[source] && pkgSet[target] {
			edgeSet[key] = true
			graph.Edges = append(graph.Edges, Edge{
				Source: source,
				Target: target,
				Kind:   "depends",
			})
		}
	}

	return graph, nil
}

func (db *DB) GetFunctionsInPackage(pkg string) ([]Node, error) {
	query := `
		SELECT id, kind, name, COALESCE(file, '') as file, COALESCE(line, 0) as line,
			   COALESCE(package, '') as package, COALESCE(type_info, '') as type_info
		FROM nodes
		WHERE package = ? AND kind = 'function'
		ORDER BY name
		LIMIT 100
	`
	rows, err := db.conn.Query(query, pkg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var functions []Node
	for rows.Next() {
		var n Node
		if err := rows.Scan(&n.ID, &n.Kind, &n.Name, &n.File, &n.Line, &n.Package, &n.TypeInfo); err != nil {
			return nil, err
		}
		functions = append(functions, n)
	}
	return functions, nil
}

func (db *DB) GetCallGraph(funcID string, depth int) (*Graph, error) {
	if depth <= 0 {
		depth = 2
	}
	if depth > 5 {
		depth = 5
	}

	graph := &Graph{Nodes: []Node{}, Edges: []Edge{}}
	visited := make(map[string]bool)
	queue := []struct {
		id    string
		level int
	}{{funcID, 0}}

	for len(queue) > 0 && len(graph.Nodes) < 60 {
		current := queue[0]
		queue = queue[1:]

		if visited[current.id] {
			continue
		}
		visited[current.id] = true

		node, err := db.getNode(current.id)
		if err != nil || node == nil {
			continue
		}
		graph.Nodes = append(graph.Nodes, *node)

		if current.level >= depth {
			continue
		}

		callees, err := db.getCallees(current.id)
		if err != nil {
			continue
		}

		for _, callee := range callees {
			graph.Edges = append(graph.Edges, Edge{
				Source: current.id,
				Target: callee,
				Kind:   "call",
			})
			if !visited[callee] {
				queue = append(queue, struct {
					id    string
					level int
				}{callee, current.level + 1})
			}
		}
	}

	return graph, nil
}

func (db *DB) GetCallersGraph(funcID string, depth int) (*Graph, error) {
	if depth <= 0 {
		depth = 2
	}
	if depth > 5 {
		depth = 5
	}

	graph := &Graph{Nodes: []Node{}, Edges: []Edge{}}
	visited := make(map[string]bool)
	queue := []struct {
		id    string
		level int
	}{{funcID, 0}}

	for len(queue) > 0 && len(graph.Nodes) < 60 {
		current := queue[0]
		queue = queue[1:]

		if visited[current.id] {
			continue
		}
		visited[current.id] = true

		node, err := db.getNode(current.id)
		if err != nil || node == nil {
			continue
		}
		graph.Nodes = append(graph.Nodes, *node)

		if current.level >= depth {
			continue
		}

		callers, err := db.getCallers(current.id)
		if err != nil {
			continue
		}

		for _, caller := range callers {
			graph.Edges = append(graph.Edges, Edge{
				Source: caller,
				Target: current.id,
				Kind:   "call",
			})
			if !visited[caller] {
				queue = append(queue, struct {
					id    string
					level int
				}{caller, current.level + 1})
			}
		}
	}

	return graph, nil
}

func (db *DB) getNode(id string) (*Node, error) {
	query := `
		SELECT id, kind, name, COALESCE(file, '') as file, COALESCE(line, 0) as line,
			   COALESCE(package, '') as package, COALESCE(type_info, '') as type_info
		FROM nodes WHERE id = ?
	`
	var n Node
	err := db.conn.QueryRow(query, id).Scan(&n.ID, &n.Kind, &n.Name, &n.File, &n.Line, &n.Package, &n.TypeInfo)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (db *DB) getCallees(funcID string) ([]string, error) {
	query := `
		SELECT DISTINCT e.target
		FROM edges e
		JOIN nodes n ON e.target = n.id
		WHERE e.source = ? AND e.kind = 'call' AND n.kind = 'function'
		LIMIT 20
	`
	rows, err := db.conn.Query(query, funcID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var callees []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		callees = append(callees, id)
	}
	return callees, nil
}

func (db *DB) getCallers(funcID string) ([]string, error) {
	query := `
		SELECT DISTINCT e.source
		FROM edges e
		JOIN nodes n ON e.source = n.id
		WHERE e.target = ? AND e.kind = 'call' AND n.kind = 'function'
		LIMIT 20
	`
	rows, err := db.conn.Query(query, funcID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var callers []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		callers = append(callers, id)
	}
	return callers, nil
}

func (db *DB) GetSource(funcID string) (string, error) {
	query := `
		SELECT s.content
		FROM sources s
		JOIN nodes n ON s.file = n.file
		WHERE n.id = ?
		LIMIT 1
	`
	var content string
	err := db.conn.QueryRow(query, funcID).Scan(&content)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return content, nil
}

func (db *DB) GetSourceByFile(file string) (string, error) {
	query := `SELECT content FROM sources WHERE file = ? LIMIT 1`
	var content string
	err := db.conn.QueryRow(query, file).Scan(&content)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return content, nil
}

func (db *DB) Search(query string, limit int) ([]SearchResult, error) {
	if limit <= 0 {
		limit = 50
	}

	sqlQuery := `
		SELECT id, kind, name, COALESCE(package, '') as package,
			   COALESCE(file, '') as file, COALESCE(line, 0) as line
		FROM nodes
		WHERE name LIKE ? AND kind IN ('function', 'type', 'method')
		ORDER BY
			CASE WHEN name = ? THEN 0
				 WHEN name LIKE ? THEN 1
				 ELSE 2
			END,
			length(name)
		LIMIT ?
	`
	searchTerm := "%" + query + "%"
	prefixTerm := query + "%"

	rows, err := db.conn.Query(sqlQuery, searchTerm, query, prefixTerm, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var r SearchResult
		if err := rows.Scan(&r.ID, &r.Kind, &r.Name, &r.Package, &r.File, &r.Line); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) GetFunctionMetrics(funcID string) (*FunctionMetrics, error) {
	query := `
		SELECT
			n.id, n.name, COALESCE(n.package, '') as package,
			COALESCE(n.file, '') as file, COALESCE(n.line, 0) as line,
			COALESCE(m.cyclomatic_complexity, 0) as complexity,
			COALESCE(m.loc, 0) as loc,
			COALESCE(m.num_params, 0) as parameters,
			COALESCE(m.fan_in, 0) as fan_in,
			COALESCE(m.fan_out, 0) as fan_out
		FROM nodes n
		LEFT JOIN metrics m ON n.id = m.function_id
		WHERE n.id = ?
	`
	var fm FunctionMetrics
	err := db.conn.QueryRow(query, funcID).Scan(
		&fm.ID, &fm.Name, &fm.Package, &fm.File, &fm.Line,
		&fm.Complexity, &fm.LOC, &fm.Parameters,
		&fm.FanIn, &fm.FanOut,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &fm, nil
}

func (db *DB) GetStats() (map[string]int, error) {
	stats := make(map[string]int)

	queries := map[string]string{
		"totalNodes":     "SELECT COUNT(*) FROM nodes",
		"totalEdges":     "SELECT COUNT(*) FROM edges",
		"totalFunctions": "SELECT COUNT(*) FROM nodes WHERE kind = 'function'",
		"totalPackages":  "SELECT COUNT(DISTINCT package) FROM nodes WHERE package != ''",
		"totalFiles":     "SELECT COUNT(DISTINCT file) FROM nodes WHERE file != ''",
	}

	for key, query := range queries {
		var count int
		if err := db.conn.QueryRow(query).Scan(&count); err != nil {
			stats[key] = 0
		} else {
			stats[key] = count
		}
	}

	return stats, nil
}

func (db *DB) GetHotspots(limit int) ([]Hotspot, error) {
	if limit <= 0 {
		limit = 20
	}

	// Try dashboard_hotspots first (pre-computed)
	query := `
		SELECT
			h.node_id, n.name, COALESCE(n.package, '') as package,
			COALESCE(n.file, '') as file, COALESCE(n.line, 0) as line,
			COALESCE(h.complexity, 0), COALESCE(h.loc, 0),
			COALESCE(h.fan_in, 0), COALESCE(h.fan_out, 0),
			COALESCE(h.score, 0)
		FROM dashboard_hotspots h
		JOIN nodes n ON h.node_id = n.id
		ORDER BY h.score DESC
		LIMIT ?
	`
	rows, err := db.conn.Query(query, limit)
	if err != nil {
		// Fallback: compute from metrics table
		query = `
			SELECT
				n.id, n.name, COALESCE(n.package, '') as package,
				COALESCE(n.file, '') as file, COALESCE(n.line, 0) as line,
				COALESCE(m.cyclomatic_complexity, 0) as complexity,
				COALESCE(m.loc, 0) as loc,
				COALESCE(m.fan_in, 0) as fan_in,
				COALESCE(m.fan_out, 0) as fan_out,
				(COALESCE(m.cyclomatic_complexity, 0) * 2 + COALESCE(m.fan_in, 0) + COALESCE(m.fan_out, 0)) as score
			FROM nodes n
			JOIN metrics m ON n.id = m.function_id
			WHERE n.kind = 'function'
			ORDER BY score DESC
			LIMIT ?
		`
		rows, err = db.conn.Query(query, limit)
		if err != nil {
			return nil, err
		}
	}
	defer rows.Close()

	var hotspots []Hotspot
	for rows.Next() {
		var h Hotspot
		if err := rows.Scan(&h.ID, &h.Name, &h.Package, &h.File, &h.Line,
			&h.Complexity, &h.LOC, &h.FanIn, &h.FanOut, &h.Score); err != nil {
			return nil, err
		}
		hotspots = append(hotspots, h)
	}
	return hotspots, nil
}

func (db *DB) GetFunctionFindings(funcID string) ([]Finding, error) {
	// Try findings table first
	query := `
		SELECT
			f.id, f.category, COALESCE(f.severity, 'info') as severity,
			COALESCE(f.message, '') as message,
			COALESCE(n.file, '') as file, COALESCE(n.line, 0) as line
		FROM findings f
		JOIN nodes n ON f.node_id = n.id
		WHERE f.node_id = ?
		ORDER BY
			CASE f.severity
				WHEN 'critical' THEN 0
				WHEN 'high' THEN 1
				WHEN 'medium' THEN 2
				WHEN 'low' THEN 3
				ELSE 4
			END
	`
	rows, err := db.conn.Query(query, funcID)
	if err != nil {
		// Table might not exist, return empty
		return []Finding{}, nil
	}
	defer rows.Close()

	var findings []Finding
	for rows.Next() {
		var f Finding
		if err := rows.Scan(&f.ID, &f.Category, &f.Severity, &f.Message, &f.File, &f.Line); err != nil {
			return nil, err
		}
		findings = append(findings, f)
	}
	return findings, nil
}

func (db *DB) SearchCode(query string, limit int) ([]SearchResult, error) {
	if limit <= 0 {
		limit = 30
	}

	// Use FTS5 full-text search on sources
	sqlQuery := `
		SELECT
			n.id, n.kind, n.name,
			COALESCE(n.package, '') as package,
			COALESCE(n.file, '') as file,
			COALESCE(n.line, 0) as line
		FROM sources_fts fts
		JOIN nodes n ON fts.file = n.file
		WHERE sources_fts MATCH ?
			AND n.kind = 'function'
		GROUP BY n.id
		LIMIT ?
	`
	rows, err := db.conn.Query(sqlQuery, query, limit)
	if err != nil {
		// FTS might not be available, fallback to LIKE search
		sqlQuery = `
			SELECT
				n.id, n.kind, n.name,
				COALESCE(n.package, '') as package,
				COALESCE(n.file, '') as file,
				COALESCE(n.line, 0) as line
			FROM sources s
			JOIN nodes n ON s.file = n.file
			WHERE s.content LIKE ?
				AND n.kind = 'function'
			GROUP BY n.id
			LIMIT ?
		`
		rows, err = db.conn.Query(sqlQuery, "%"+query+"%", limit)
		if err != nil {
			return nil, err
		}
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var r SearchResult
		if err := rows.Scan(&r.ID, &r.Kind, &r.Name, &r.Package, &r.File, &r.Line); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}
