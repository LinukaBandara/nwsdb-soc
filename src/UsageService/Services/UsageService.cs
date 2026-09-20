using Microsoft.EntityFrameworkCore;
using NWSDB.UsageService.Models;

namespace NWSDB.UsageService.Services;

public class UsageService : IUsageService
{
    private readonly UsageDbContext _db;

    public UsageService(UsageDbContext db)
    {
        _db = db;
    }

    public async Task<MeterReading> RecordReadingAsync(RecordReadingRequest request)
    {
        var reading = new MeterReading
        {
            AccountNumber = request.AccountNumber,
            CubicMetres = request.CubicMetres
        };
        _db.Readings.Add(reading);
        await _db.SaveChangesAsync();
        return reading;
    }

    public async Task<UsageResponse?> GetLatestUsageAsync(string accountNumber)
    {
        var readings = await _db.Readings
            .Where(r => r.AccountNumber == accountNumber)
            .OrderByDescending(r => r.ReadingDateUtc)
            .Take(2)
            .ToListAsync();

        if (readings.Count == 0) return null;

        var current = readings[0];
        var previous = readings.Count > 1 ? readings[1].CubicMetres : 0;
        var consumed = current.CubicMetres - previous;

        return new UsageResponse(
            accountNumber, current.CubicMetres, previous, consumed,
            CalculateBill(consumed), current.ReadingDateUtc);
    }

    public async Task<IReadOnlyList<MeterReading>> GetHistoryAsync(string accountNumber) =>
        await _db.Readings
            .Where(r => r.AccountNumber == accountNumber)
            .OrderByDescending(r => r.ReadingDateUtc)
            .ToListAsync();

    /// <summary>
    /// Simplified tiered tariff, modelled loosely on NWSDB's published
    /// domestic tariff structure (increasing rate per block of consumption).
    /// Kept as a pure function so it is trivially unit-testable in isolation.
    /// </summary>
    public static decimal CalculateBill(double unitsConsumed)
    {
        if (unitsConsumed <= 0) return 0m;

        decimal bill = 0m;
        double remaining = unitsConsumed;

        (double cap, decimal rate)[] tiers =
        {
            (10, 15m),
            (10, 30m),
            (10, 60m),
            (double.MaxValue, 100m)
        };

        foreach (var (cap, rate) in tiers)
        {
            if (remaining <= 0) break;
            var unitsInTier = Math.Min(remaining, cap);
            bill += (decimal)unitsInTier * rate;
            remaining -= unitsInTier;
        }

        return Math.Round(bill, 2);
    }
}
