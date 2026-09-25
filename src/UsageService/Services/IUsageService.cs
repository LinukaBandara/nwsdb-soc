using NWSDB.UsageService.DTOs;
using NWSDB.UsageService.Models;

namespace NWSDB.UsageService.Services;

public interface IUsageService
{
    Task<MeterReading> RecordReadingAsync(RecordReadingRequest request);
    Task<UsageResponse?> GetLatestUsageAsync(string accountNumber);
    Task<IReadOnlyList<MeterReading>> GetHistoryAsync(string accountNumber);
}
