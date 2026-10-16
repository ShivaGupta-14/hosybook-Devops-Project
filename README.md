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

Trivy scans every image right after it is built and before it is pushed. For the backend it checked the Debian 13 base (87 OS packages) and all the Python libraries, for the frontend it checked the Alpine 3.21 base of the nginx image (68 packages). The step uses `--severity HIGH,CRITICAL --ignore-unfixed --exit-code 1`, so if any high or critical issue with an available fix shows up, the job fails and the image never reaches GHCR.

Both scans came back clean (0 vulnerabilities). This is mainly because both Dockerfiles upgrade the OS packages during the build. For example, `apk upgrade` in the frontend image updated 22 old packages from the nginx base image like libpng, libxml2 and xz-libs, which are the kind of libraries where CVEs usually show up. I also use newer FastAPI and Starlette versions that already have the known fixes.

## Terraform (AWS)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan -out=tfplan
terraform apply tfplan
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

## Problems I ran into

- **Backend crashed on first start** in compose because the migration ran before postgres was ready. Fixed with a `pg_isready` healthcheck and `condition: service_healthy`.
- **Helm upgrade failed with a conflict on `replicas`** because the HPA also changes that field. Now the chart only sets `replicas` when HPA is off.
- **Minikube kept restarting pods** when the app, Prometheus, Grafana and Argo CD all ran together with a load test. Docker Desktop only had about 8 GB of RAM. I made probe timeouts a bit longer, turned off the 25 default Grafana dashboards and only kept the HosyBook one, and stopped running everything at the same time.
- **GHCR needs lowercase names** but my GitHub username has capitals, so the workflow lowercases the owner before tagging.

## Screenshots

### App (M1)

App running with Docker Compose at `localhost:3000`:

![app](screenshots/02-app-docker-compose.png)

Swagger docs with all endpoints:

![swagger](screenshots/03-swagger-docs.png)

### Tests (M2)

![pytest](screenshots/04-pytest.png)

### Git and GitHub (M3)

![repo](screenshots/06-github-repo.png)

![git log](screenshots/05-git-log.png)

### Docker (M4)

![compose](screenshots/01-docker-compose-up.png)

### CI/CD (M5)

![pipeline](screenshots/07-pipeline-green.png)

![ghcr backend](screenshots/07c-ghcr-packages.png)

![ghcr frontend](screenshots/07d-ghcr-frontend.png)

### Trivy (M6)

![trivy](screenshots/07b-trivy-scan.png)

### Terraform (M7)

![plan](screenshots/14-terraform-plan.png)

EKS cluster active in ap-south-1:

![aws console](screenshots/15-aws-console.png)

VPC created by terraform:

![vpc](screenshots/15c-aws-vpc.png)

Connected to EKS, both nodes ready:

![eks nodes](screenshots/15b-eks-nodes.png)

Destroyed right after, and checked nothing is left:

![destroy](screenshots/16-terraform-destroy.png)

![cleanup](screenshots/16b-aws-cleanup-check.png)

### Kubernetes + Helm (M8)

![pods](screenshots/08-k8s-pods-svc.png)

![helm](screenshots/09-helm-list.png)

App opened through the ingress:

![ingress](screenshots/10-app-ingress.png)

### Monitoring (M9)

![metrics](screenshots/11-metrics.png)

![prometheus](screenshots/12-prometheus-targets.png)

![grafana](screenshots/13-grafana.png)
