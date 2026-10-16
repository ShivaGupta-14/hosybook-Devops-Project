# HosyBook

HosyBook is a small clinic appointment app. The receptionist can book a patient with a doctor, pick a time slot, mark the visit as done or cancel it, and see how the day looks at one place.

I made this as my DevOps final capstone. The app is simple on purpose, the main focus is taking it from my laptop to a monitored Kubernetes cluster with a full CI/CD pipeline.

Mascot of the app is **Hosy**, a little pill capsule with a plus on its belly.

## Why

Many small clinics still keep appointments in a register or on WhatsApp. Two patients get the same slot, nobody knows how many people are waiting, and there is no record of the day. HosyBook fixes this with one screen for the front desk, and it does not let a doctor get double booked.

## Features

- Book appointment with patient name, phone, doctor, date and time slot
- Same doctor cannot be booked twice in the same slot (API returns 409)
- Taken slots are greyed out in the booking form
- Mark appointment as done or cancelled, reschedule, delete
- Today view with total, waiting and filled slots, plus a 7 day strip
- All appointments list with status filters and search by name or phone
- Doctors view with booked and free slots for each doctor
- Works on mobile and desktop

## Tech stack

| Part | Tool |
|---|---|
| Frontend | React + Vite, plain CSS, served by Nginx |
| Backend | FastAPI (Python 3.12), SQLAlchemy, Alembic |
| Database | PostgreSQL 16 |
| Tests | Pytest with a SQLite test database |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions, GHCR |
| Security | Trivy image scan |
| Infra | Terraform (AWS VPC + EKS) |
| Kubernetes | Minikube, Helm, Nginx Ingress, HPA, Argo CD |
| Monitoring | Prometheus + Grafana (kube-prometheus-stack) |

## Architecture

```
developer -> git push -> GitHub Actions
                          |- pytest
                          |- frontend build
                          |- docker build (backend + frontend)
                          |- trivy scan
                          |- push to GHCR (tag = commit sha)
                          `- update image tag in helm values
                                     |
                                Argo CD sync
                                     |
            Kubernetes (namespace hosybook, installed with Helm)
              ingress hosybook.localhost
                 /     -> frontend (nginx, 2 pods)
                 /api  -> backend (fastapi, 2+ pods, HPA) -> postgres (PVC)
                                     |
                         Prometheus scrapes /metrics -> Grafana
```

## Project structure

```
backend/      FastAPI app, alembic migrations, pytest tests, Dockerfile
frontend/     React app, Hosy mascot, nginx config, Dockerfile
helm/         helm chart for the whole app
k8s/          namespace and argo cd application
monitoring/   prometheus values and grafana dashboard
terraform/    AWS VPC + EKS
scripts/      load test script
.github/      CI/CD workflow
```

## API

| Method | Path | What it does |
|---|---|---|
| GET | /health | liveness check |
| GET | /ready | readiness check, also checks the database |
| GET | /metrics | prometheus metrics |
| GET | /api/doctors | list of doctors |
| GET | /api/appointments | list, filters: `day`, `status`, `doctor` |
| GET | /api/appointments/{id} | one appointment |
| POST | /api/appointments | book new appointment |
| PUT | /api/appointments/{id} | reschedule or change status |
| DELETE | /api/appointments/{id} | delete appointment |
| GET | /api/appointments/stats | counts for a day |

Swagger docs are at `http://localhost:8000/docs`.

## Run locally with Docker Compose

```bash
docker compose up --build
```

- App: http://localhost:3000
- API docs: http://localhost:8000/docs

Stop with `docker compose down` (add `-v` to delete the database too).

## Run tests

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -v
```

Tests use a separate SQLite file (`test.db`), so they never touch the real Postgres database. There are 16 tests covering health, booking, validation, double booking, filters, update, delete and stats.

## CI/CD

Workflow file is `.github/workflows/ci-cd.yml`. It runs on every push and PR to `main`.

1. **test** - runs pytest and builds the frontend. If any test fails the pipeline stops here.
2. **build-scan-push** - builds both images, scans them with Trivy, then pushes to GHCR. Images are tagged with the git commit SHA, not `latest`.
3. **deploy** - writes the new SHA into `helm/hosybook/values.yaml` and commits it. Argo CD running in my cluster sees the change and rolls out the new version.

## Security scan (Trivy)

Trivy scans the OS packages and Python/Node libraries inside both images. The pipeline fails if it finds any HIGH or CRITICAL issue that already has a fix. To keep the scan clean I upgrade OS packages in both Dockerfiles (`apt-get upgrade` and `apk upgrade`) and use patched versions of FastAPI and Starlette.

## Terraform (AWS)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
aws eks update-kubeconfig --region ap-south-1 --name hosybook-eks
terraform destroy
```

It creates a VPC with 2 public and 2 private subnets, one NAT gateway and an EKS cluster with a managed node group of 2 `t3.small` nodes in `ap-south-1`. No AWS keys are stored in the repo, terraform uses my local AWS CLI profile. I destroy it right after testing to avoid cost.

## Kubernetes with Helm (minikube)

```bash
minikube start --addons=ingress,metrics-server
kubectl apply -f k8s/namespace.yaml
helm upgrade --install hosybook ./helm/hosybook -n hosybook
kubectl get pods -n hosybook
kubectl get svc -n hosybook
helm list -n hosybook
```

Then forward the ingress controller and open http://hosybook.localhost:8080 (any `*.localhost` name points to my own machine, so no `/etc/hosts` change is needed).

```bash
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
```

The chart has:

- backend and frontend deployments with 2 replicas each
- ClusterIP services for backend, frontend and postgres
- ingress: `/` goes to frontend and `/api` goes to backend
- postgres with a PVC and a secret
- HPA for backend (2 to 5 pods at 60% CPU)
- startup, readiness and liveness probes
- ServiceMonitor so Prometheus scrapes `/metrics`

### Argo CD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f k8s/argocd-app.yaml
```

## Monitoring

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f monitoring/prometheus-values.yaml
kubectl apply -f monitoring/grafana-dashboard.yaml
kubectl port-forward -n monitoring svc/monitoring-grafana 3001:80
```

Grafana login is `admin` / `hosybook`. The HosyBook dashboard shows requests per second, p95 latency, error rate, bookings in the last hour and backend pods up.

To see the graphs and HPA move, run `./scripts/load-test.sh`.

## Screenshots

Screenshots are in the `screenshots/` folder.
