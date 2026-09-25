namespace NWSDB.UsageService.DTOs;

public record UsageResponse(
    string AccountNumber,
    double CurrentCubicMetres,
    double PreviousCubicMetres,
    double UnitsConsumed,
    decimal EstimatedBill,
    DateTime ReadingDateUtc);