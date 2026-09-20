# NWSDB Service-Oriented Solution

A Service-Oriented Computing (SOC) solution for the Sri Lanka National Water
Supply & Drainage Board (NWSDB) case study — CSE5013 WRIT1.

Two independently deployable **.NET 10 Web API** services (Payment Service,
Usage Service), each owning its own data store, consumed by a **React**
client application and available for third-party partner integration over
a standard REST/JSON contract.

## Solution layout

```
NWSDB-SOC/
├── NWSDB-SOC.sln
├── src/
│   ├── PaymentService/      # .NET 10 Web API — bill payments
│   └── UsageService/       # .NET 10 Web API — meter readings & billing
├── tests/
│   ├── PaymentService.Tests/   # xUnit unit + integration tests
│   └── UsageService.Tests/
├── client/                  # React (Vite) client consuming both APIs
├── deployment/k8s/          # Kubernetes manifests
├── docker-compose.yml       # Local multi-container orchestration
├── .github/workflows/       # GitHub Actions CI workflow
└── docs/                    # Architecture diagrams (source + rendered)
```

## Prerequisites

- .NET 10 SDK
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
The React client uses the Nginx container to proxy `/api/v1/payments` to
the Payment Service and `/api/v1/usage` to the Usage Service.

## Running the automated tests

```bash
dotnet test NWSDB-SOC.sln
```

The test suite covers:
- Payment service business logic
- Usage service business logic
- Validation and error cases
- Payment API HTTP responses
- API health-check behaviour
- Account-specific payment history

The tests use an EF Core in-memory provider and `WebApplicationFactory`
for HTTP integration testing. The current suite contains **17 automated
tests**.

## Deployment reference

Kubernetes manifests are provided as a deployment design/reference for the
assignment. They define separate Deployments and Services for the Payment
and Usage services, health probes, and horizontal scaling configuration.

```bash
kubectl create namespace nwsdb-prod
kubectl apply -f deployment/k8s/
```

The repository does not claim a live Kubernetes cluster or production payment
gateway. Payment gateway processing is simulated for the academic
demonstration, and the services currently use EF Core InMemory storage.

## Diagrams

The `docs/diagrams` directory contains the architecture, use-case, activity,
class, ER, and deployment diagrams used to explain the solution design.
