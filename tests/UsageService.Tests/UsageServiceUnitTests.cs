using Microsoft.EntityFrameworkCore;
using NWSDB.UsageService.Models;
using Xunit;
using UsageServiceImpl = NWSDB.UsageService.Services.UsageService;

namespace UsageService.Tests;

public class UsageServiceUnitTests
{
    private static UsageDbContext NewDb() =>
        new(new DbContextOptionsBuilder<UsageDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Theory]
    [InlineData(0, 0)]
    [InlineData(5, 75)]
    [InlineData(10, 150)]
    [InlineData(15, 300)]
    public void CalculateBill_AppliesTieredTariffCorrectly(double units, decimal expectedBill)
    {
        var bill = UsageServiceImpl.CalculateBill(units);

        Assert.Equal(expectedBill, bill);
    }

    [Fact]
    public void CalculateBill_IsMonotonicallyIncreasingWithUsage()
    {
        var lower = UsageServiceImpl.CalculateBill(20);
        var higher = UsageServiceImpl.CalculateBill(40);

        Assert.True(higher > lower);
    }

    [Fact]
    public async Task RecordReading_WithNegativeUsage_ThrowsArgumentException()
    {
        var db = NewDb();
        var service = new UsageServiceImpl(db);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RecordReadingAsync(new RecordReadingRequest("NWSDB-0001", -1)));
    }

    [Fact]
    public async Task GetLatestUsage_WithTwoReadings_CalculatesConsumptionDelta()
    {
        var db = NewDb();
        var service = new UsageServiceImpl(db);

        await service.RecordReadingAsync(new RecordReadingRequest("NWSDB-0001", 100));
        await service.RecordReadingAsync(new RecordReadingRequest("NWSDB-0001", 118));

        var usage = await service.GetLatestUsageAsync("NWSDB-0001");

        Assert.NotNull(usage);
        Assert.Equal(18, usage!.UnitsConsumed, precision: 3);
    }

    [Fact]
    public async Task GetLatestUsage_ForUnknownAccount_ReturnsNull()
    {
        var db = NewDb();
        var service = new UsageServiceImpl(db);

        var usage = await service.GetLatestUsageAsync("NO-SUCH-ACCOUNT");

        Assert.Null(usage);
    }
}
