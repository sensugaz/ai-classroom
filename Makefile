.PHONY: backend frontend pipeline mongo all stop clean push

# --- Individual services (local dev, no Docker) ---

backend:
	cd services/api && go run classroom.go

frontend:
	cd web && npm run dev

pipeline:
	cd services/pipeline && uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload

mongo:
	docker compose up mongodb -d

# --- Docker ---

up:
	docker compose up --build -d

down:
	docker compose down

# --- Pipeline (runs on GPU machine) ---

pipeline-up:
	cd services/pipeline && docker compose up --build

pipeline-down:
	cd services/pipeline && docker compose down

# --- Setup ---

install:
	cd web && npm install
	cd services/api && go mod download

install-pipeline:
	which ffmpeg > /dev/null 2>&1 || (echo "Installing ffmpeg & espeak-ng..." && sudo apt-get update && sudo apt-get install -y ffmpeg espeak-ng)
	which espeak-ng > /dev/null 2>&1 || (sudo apt-get update && sudo apt-get install -y espeak-ng)
	cd services/pipeline && pip install -e .

# --- Build ---

build-backend:
	cd services/api && CGO_ENABLED=0 go build -o bin/classroom-api classroom.go

build-frontend:
	cd web && npm run build

# --- All local dev (backend + frontend + mongo) ---

all:
	@echo "Starting mongo, backend, frontend..."
	@make mongo
	@trap 'kill 0' EXIT; \
		make backend & \
		make frontend & \
		wait

# --- Git ---

push:
	git add -A
	git commit -m "$(or $(m),update)"
	git push

clean:
	docker compose down -v
	rm -rf web/.next web/node_modules services/api/bin
