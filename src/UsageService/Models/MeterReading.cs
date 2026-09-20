namespace NWSDB.UsageService.Models;

/// <summary>
/// A single water-meter reading for a customer account, in cubic metres.
/// Owned exclusively by the Usage Service — the Payment Service never
/// touches this data directly, and vice versa. Each service owns its
/// own data store, a core SOA/microservices principle that keeps the
/// two teams/deployments independent.
/// </summary>
public class MeterReading
{
    public int Id { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public double CubicMetres { get; set; }
    public DateTime ReadingDateUtc { get; set; } = DateTime.UtcNow;
}

public record UsageResponse(string AccountNumber, double CurrentCubicMetres,
    double PreviousCubicMetres, double UnitsConsumed, decimal EstimatedBill, DateTime ReadingDateUtc);

public record RecordReadingRequest(string AccountNumber, double CubicMetres);
