# NWSDB Service-Oriented Solution

A Service-Oriented Computing (SOC) solution for the Sri Lanka National Water
Supply and Drainage Board (NWSDB) case study — CSE5013 WRIT1.

Two independently deployable **.NET 8 Web API** services (Payment Service,
Usage Service), each owning its own data store, consumed by a **React**
client application and available for third-party partner integration over
a standard REST/JSON contract.

## Solution layout

```
NWSDB-SOC/
├── NWSDB-SOC.sln
├── src/
│   ├── PaymentService/      # .NET 8 Web API — bill payments
│   └── UsageService/        # .NET 8 Web API — meter readings & billing
├── tests/
│   ├── PaymentService.Tests/   # xUnit unit + integration tests
│   └── UsageService.Tests/
├── client/                  # React (Vite) client consuming both APIs
├── deployment/k8s/          # Kubernetes manifests
├── docker-compose.yml       # Local multi-container orchestration
├── .github/workflows/       # CI/CD pipeline (GitHub Actions)
└── docs/                    # Architecture diagrams (source + rendered)
```

## Prerequisites

- .NET 8 SDK
- Node.js 18+ and npm
- Docker Desktop (optional, for containerised run)

## Running locally (without Docker)

```bash
# Terminal 1 — Payment Service (https://localhost:5001)
cd src/PaymentService
dotnet run

# Terminal 2 — Usage Service (https://localhost:5011)
cd src/UsageService
dotnet run

# Terminal 3 — React client (http://localhost:5173)
cd client
npm install
npm run dev
```

Swagger UI is available at `/swagger` on each service in Development mode
for exploring and testing the API directly.

## Running with Docker Compose

```bash
docker compose up --build
```

This builds and starts all three containers on a shared bridge network:
Payment Service on `:5001`, Usage Service on `:5011`, client on `:8080`.

## Running the automated tests

```bash
dotnet test NWSDB-SOC.sln
```

This runs both the `PaymentService.Tests` and `UsageService.Tests` projects
(unit tests against the service layer with an in-memory EF Core provider,
plus integration tests against the full HTTP pipeline via
`WebApplicationFactory`).

## Deploying to Kubernetes

```bash
kubectl create namespace nwsdb-prod
kubectl apply -f deployment/k8s/
```

See the accompanying report (Task 4) for the full deployment rationale.
