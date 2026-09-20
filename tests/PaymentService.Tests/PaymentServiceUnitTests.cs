using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NWSDB.PaymentService.Models;
using Xunit;
using PaymentServiceImpl = NWSDB.PaymentService.Services.PaymentService;

namespace PaymentService.Tests;

/// <summary>
/// Unit tests for PaymentService, isolated from HTTP/controller concerns.
/// Each test uses a fresh, uniquely-named in-memory database so tests
/// never leak state into one another.
/// </summary>
public class PaymentServiceUnitTests
{
    private static PaymentDbContext NewDb() =>
        new(new DbContextOptionsBuilder<PaymentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task CreatePayment_WithValidAmount_ReturnsCompletedPayment()
    {
        // Arrange
        var db = NewDb();
        var service = new PaymentServiceImpl(db, NullLogger<PaymentServiceImpl>.Instance);
        var request = new CreatePaymentRequest("NWSDB-0001", 2500m, "eZCash");

        // Act
        var payment = await service.CreatePaymentAsync(request);

        // Assert
        Assert.Equal(PaymentStatus.Completed, payment.Status);
        Assert.Equal(2500m, payment.Amount);
        Assert.False(string.IsNullOrWhiteSpace(payment.ReferenceNumber));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-50)]
    public async Task CreatePayment_WithNonPositiveAmount_ThrowsArgumentException(decimal amount)
    {
        var db = NewDb();
        var service = new PaymentServiceImpl(db, NullLogger<PaymentServiceImpl>.Instance);
        var request = new CreatePaymentRequest("NWSDB-0001", amount, "eZCash");

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreatePaymentAsync(request));
    }

    [Fact]
    public async Task GetPaymentsForAccount_ReturnsOnlyThatAccountsPayments_NewestFirst()
    {
        var db = NewDb();
        var service = new PaymentServiceImpl(db, NullLogger<PaymentServiceImpl>.Instance);

        await service.CreatePaymentAsync(new CreatePaymentRequest("NWSDB-0001", 1000m, "Portal"));
        await service.CreatePaymentAsync(new CreatePaymentRequest("NWSDB-0002", 500m, "Portal"));
        await service.CreatePaymentAsync(new CreatePaymentRequest("NWSDB-0001", 750m, "BankApp"));

        var results = await service.GetPaymentsForAccountAsync("NWSDB-0001");

        Assert.Equal(2, results.Count);
        Assert.All(results, p => Assert.Equal("NWSDB-0001", p.AccountNumber));
        Assert.Equal(750m, results.First().Amount); // most recent first
    }

    [Fact]
    public async Task UpdateStatus_OnUnknownId_ReturnsNull()
    {
        var db = NewDb();
        var service = new PaymentServiceImpl(db, NullLogger<PaymentServiceImpl>.Instance);

        var result = await service.UpdateStatusAsync(999, PaymentStatus.Failed);

        Assert.Null(result);
    }
}
