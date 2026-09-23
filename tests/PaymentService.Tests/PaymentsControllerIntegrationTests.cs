using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NWSDB.PaymentService.Controllers;
using NWSDB.PaymentService.Models;
using Xunit;

namespace PaymentService.Tests;

public class PaymentsControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public PaymentsControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        var testFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
            });
        });

        _client = testFactory.CreateClient();
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

    [Fact]
    public async Task Post_PayHereCheckout_UsesMerchantSecretExactlyAsConfigured()
    {
        const string merchantId = "1238181";
        const string merchantSecret = "MzM3MTg5NTEyNzMwMDkwMTQ5MjgxMDIwOTA2NTI5Mzc4MjI4MDk3Mg==";
        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PayHere:MerchantId"] = merchantId,
                ["PayHere:MerchantSecret"] = merchantSecret,
                ["PayHere:Sandbox"] = "true",
                ["PayHere:NotifyUrl"] = "https://example.test/api/v1/payments/payhere/notify"
            }));
            builder.ConfigureServices(services => services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { }));
        });
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/payments/payhere/checkout", new PayHereCheckoutRequest("NWSDB-0099", 1000m));

        response.EnsureSuccessStatusCode();
        var checkout = await response.Content.ReadFromJsonAsync<PayHereCheckoutResponse>();
        Assert.NotNull(checkout);
        var expectedHash = CreateCheckoutHash(merchantId, checkout!.Fields["order_id"], "1000.00", "LKR", merchantSecret);
        Assert.Equal(expectedHash, checkout.Fields["hash"]);
    }

    private static string CreateCheckoutHash(string merchantId, string orderId, string amount, string currency, string merchantSecret)
    {
        var secretHash = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(merchantSecret)));
        return Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(merchantId + orderId + amount + currency + secretHash)));
    }
}

internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "TestAuth";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "999"),
            new Claim(ClaimTypes.Name, "Integration Test User"),
            new Claim(ClaimTypes.Email, "integration-test@nwsdb.local"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("accountNumber", "NWSDB-0099")
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
