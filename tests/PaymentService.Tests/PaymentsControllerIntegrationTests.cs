using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using NWSDB.PaymentService.Models;
using Xunit;

namespace PaymentService.Tests;

/// <summary>
/// End-to-end tests that spin up the actual ASP.NET Core pipeline
/// (routing, model binding, DI, middleware) via WebApplicationFactory,
/// proving the API contract works as consumers will actually call it —
/// this is the "testing results" evidence for Task 3.
/// </summary>
public class PaymentsControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public PaymentsControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_CreatePayment_Returns201AndLocationHeader()
    {
        var request = new CreatePaymentRequest("NWSDB-0099", 1500m, "NWSDB-Portal");

        var response = await _client.PostAsJsonAsync("/api/v1/payments", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var body = await response.Content.ReadFromJsonAsync<PaymentResponse>();
        Assert.NotNull(body);
        Assert.Equal("Completed", body!.Status);
    }

    [Fact]
    public async Task Post_CreatePayment_WithZeroAmount_Returns400()
    {
        var request = new CreatePaymentRequest("NWSDB-0099", 0m, "NWSDB-Portal");

        var response = await _client.PostAsJsonAsync("/api/v1/payments", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Get_UnknownPayment_Returns404()
    {
        var response = await _client.GetAsync("/api/v1/payments/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task HealthCheck_ReturnsHealthy()
    {
        var response = await _client.GetAsync("/health");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("healthy", body);
    }
}
