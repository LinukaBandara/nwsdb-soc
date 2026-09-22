# Task 3 — Testing and Debugging

## 3.1 Test Plan

The NWSDB Service-Oriented Computing solution is tested at unit, integration, API, authorization, validation, and client-integration levels. Testing focuses on the Payment Service, Usage Service, Identity Service, and React client.

### Objectives

- Verify that core service functions produce the expected results.
- Verify REST API status codes and responses.
- Verify validation and invalid-input handling.
- Verify authentication and role-based authorization.
- Verify customer account isolation.
- Verify communication between the React client and backend services.
- Record defects found during development and the corrective action taken.

### Test environment

| Item | Environment |
|---|---|
| Backend | .NET 10 |
| Client | React + Vite |
| Payment API | http://localhost:5000 |
| Usage API | http://localhost:5010 |
| Identity API | http://localhost:5021 |
| Database | EF Core InMemory |
| Automated framework | xUnit |
| API integration | WebApplicationFactory + HttpClient |
| Browser | Microsoft Edge / Chrome |
| Test data | NWSDB-0001 and test accounts |

## 3.2 Test Cases

| ID | Area | Test | Expected Result | Type |
|---|---|---|---|---|
| TC-01 | Payment | Create payment with valid account, amount and channel | Payment is created with a reference and Completed status | Unit |
| TC-02 | Payment | Create payment with amount 0 | Request is rejected with validation error | Unit/API |
| TC-03 | Payment | Create payment with negative amount | Argument/validation error is returned | Unit |
| TC-04 | Payment | Retrieve payment for an unknown ID | API returns 404 Not Found | Integration |
| TC-05 | Payment | Retrieve account payment history | Only payments belonging to the requested account are returned | Unit |
| TC-06 | Payment | Payment history ordering | Newest payment is returned first | Unit |
| TC-07 | Payment | Update status for unknown payment | No payment is updated and not-found behaviour is returned | Unit/API |
| TC-08 | Payment | Payment health endpoint | /health returns healthy response | Integration |
| TC-09 | Usage | Calculate bill for 0 units | Expected tariff result is produced | Unit |
| TC-10 | Usage | Calculate bill for different tariff ranges | Correct tiered bill is calculated | Unit |
| TC-11 | Usage | Record negative meter reading | Reading is rejected | Unit |
| TC-12 | Usage | Calculate consumption from two readings | Difference between readings is returned | Unit |
| TC-13 | Usage | Request usage for unknown account | No usage record is returned | Unit |
| TC-14 | Usage | Record a valid meter reading as Staff/Admin | Reading is stored successfully | Integration |
| TC-15 | Identity | Login with valid seeded Admin credentials | JWT token and Admin role are returned | API |
| TC-16 | Identity | Login with invalid credentials | Authentication fails and no valid session is created | API |
| TC-17 | Identity | Register a new customer | Customer account is created and can authenticate | API |
| TC-18 | Authorization | Customer attempts staff-only meter recording | Request is rejected with 403 Forbidden | Integration |
| TC-19 | Authorization | Customer requests another account's protected payment/usage data | Access is denied or limited to the authenticated account | Integration |
| TC-20 | Client | React portal loads data from Payment/Usage APIs after login | Dashboard displays API data without a client-side error | System |

## 3.3 Automated Testing

The repository contains automated xUnit tests covering payment business logic, payment HTTP integration, usage calculations, validation, unknown-account handling, and health checks.

The Payment Service unit tests verify valid payment creation, invalid amounts, account-specific payment history, and unknown payment status updates. Payment integration tests verify HTTP 201/400/404 responses and the service health endpoint.

The Usage Service unit tests verify tariff calculations, monotonic billing behaviour, negative-reading validation, consumption calculation, and unknown-account behaviour.

The automated suite reported **17 tests** during the completed local verification cycle.

## 3.4 Manual System and API Testing

Manual testing was used for the complete authentication and service workflow because the React client, Identity Service, Payment Service and Usage Service must operate together.

The completed verification flow included:

1. Identity service health check.
2. Payment service health check.
3. Usage service health check.
4. Customer registration.
5. Customer login.
6. JWT-authenticated `/me` request.
7. Customer retrieval of usage.
8. Customer retrieval of payment history.
9. Customer attempt to record a meter reading and confirmation of 403 Forbidden.
10. Admin login.
11. Admin user-directory access.
12. Staff-user creation.
13. Staff login.
14. Staff meter-reading submission.
15. Admin payment creation.
16. Admin payment status update.
17. PayHere checkout/notification endpoint verification.

## 3.5 White-Box Testing

White-box testing was applied to important service logic by examining the internal branches and conditions rather than testing only the UI.

### Payment Service

Important paths include:

- Positive amount → payment creation.
- Zero/negative amount → validation exception.
- Existing payment ID → status update.
- Unknown payment ID → null/not-found path.
- Account filter → only matching account records returned.

### Usage Service

Important paths include:

- Different consumption ranges → different tariff branches.
- Negative reading → validation exception.
- Two readings → consumption delta calculation.
- Unknown account → null result.
- Valid reading → persistence path.

These tests exercise decision points in the service layer and help detect logic errors before the React client is used.

## 3.6 Defects and Debugging Record

| Defect | Cause | Corrective Action | Result |
|---|---|---|---|
| Authorization header was lost during local HTTPS redirect | HTTP request was redirected to HTTPS during development | Local Payment/Usage development flow was changed to use direct HTTP | API calls authenticated correctly |
| Payment request was rejected by the API | Frontend/test payload used `paymentMethod` while the API contract expects `channel` | Updated request usage to the defined `channel` field | Payment creation succeeded |
| Public landing page appeared unstyled | PublicHome component existed but its `.public-*` styles were missing from the restored stylesheet | Rebuilt the public landing-page CSS | Public site displayed correctly |
| Staff/Admin dashboard needed clearer sign-out access | Sign-out existed in sidebar but was not visible in the top header | Added header sign-out control | Sign-out is available from the dashboard header |
| Usage authentication diagnostics needed improvement | JWT validation failures were difficult to diagnose | Hardened Usage Service JWT validation/diagnostics | Authentication behaviour became easier to verify |

## 3.7 Test Result Summary

The implementation passed the completed automated and manual verification cycle used during development. Core authentication, authorization, usage, payment, health-check, and client/API communication flows were verified locally.

Testing evidence should be supported in the final report with screenshots of:

- Public NWSDB home page.
- Login page.
- Customer dashboard.
- Staff/Admin dashboard.
- Successful payment.
- Usage information.
- Swagger/API endpoint response.
- Invalid-input validation response.
- 403 authorization response.
- Automated test result showing all tests passed.

## 3.8 Limitations

The current academic demonstration uses EF Core InMemory storage. Data is therefore not intended to represent a production persistent database. PayHere is demonstrated through its sandbox/integration endpoints rather than a production payment gateway. Kubernetes manifests are deployment reference material rather than evidence of a live production cluster.
