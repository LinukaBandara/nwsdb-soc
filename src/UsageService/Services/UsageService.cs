using Microsoft.EntityFrameworkCore;
using NWSDB.UsageService.Data;
using NWSDB.UsageService.DTOs;
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
        if (string.IsNullOrWhiteSpace(request.AccountNumber))
            throw new ArgumentException("Account number is required.");

        if (request.CubicMetres < 0)
            throw new ArgumentException("Cubic metres cannot be negative.");

        var accountNumber = request.AccountNumber.Trim();
        var previousReading = await _db.Readings
            .Where(r => r.AccountNumber == accountNumber)
            .OrderByDescending(r => r.ReadingDateUtc)
            .ThenByDescending(r => r.Id)
            .Select(r => (double?)r.CubicMetres)
            .FirstOrDefaultAsync();

        if (previousReading.HasValue && request.CubicMetres < previousReading.Value)
            throw new ArgumentException($"Cubic metres cannot be lower than the previous reading of {previousReading.Value:0.##} m³.");

        var reading = new MeterReading
        {
            AccountNumber = accountNumber,
            CubicMetres = request.CubicMetres
        };

        _db.Readings.Add(reading);
        await _db.SaveChangesAsync();
        return reading;
    }

    public async Task<UsageResponse?> GetLatestUsageAsync(string accountNumber)
    {
        accountNumber = accountNumber.Trim();

        var readings = await _db.Readings
            .Where(r => r.AccountNumber == accountNumber)
            .OrderByDescending(r => r.ReadingDateUtc)
            .ThenByDescending(r => r.Id)
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

    public async Task<IReadOnlyList<MeterReading>> GetHistoryAsync(string accountNumber)
    {
        accountNumber = accountNumber.Trim();

        return await _db.Readings
            .Where(r => r.AccountNumber == accountNumber)
            .OrderByDescending(r => r.ReadingDateUtc)
            .ThenByDescending(r => r.Id)
            .ToListAsync();
    }


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
