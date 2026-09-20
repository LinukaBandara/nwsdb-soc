using Microsoft.AspNetCore.Mvc;
using NWSDB.UsageService.Models;
using NWSDB.UsageService.Services;

namespace NWSDB.UsageService.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
public class UsageController : ControllerBase
{
    private readonly IUsageService _usageService;

    public UsageController(IUsageService usageService)
    {
        _usageService = usageService;
    }

    /// <summary>Record a new meter reading (called by field devices / smart meters).</summary>
    [HttpPost("readings")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult> RecordReading(RecordReadingRequest request)
    {
        var reading = await _usageService.RecordReadingAsync(request);
        return CreatedAtAction(nameof(GetHistory), new { accountNumber = reading.AccountNumber }, reading);
    }

    /// <summary>Get up-to-date usage and an estimated bill for a customer —
    /// this is the "most up-to-date payment and current usage details"
    /// capability requested in the case study, and the endpoint the
    /// client app and third-party partners consume.</summary>
    [HttpGet("{accountNumber}/latest")]
    [ProducesResponseType(typeof(UsageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UsageResponse>> GetLatest(string accountNumber)
    {
        var usage = await _usageService.GetLatestUsageAsync(accountNumber);
        return usage is null ? NotFound() : Ok(usage);
    }

    [HttpGet("{accountNumber}/history")]
    [ProducesResponseType(typeof(IEnumerable<MeterReading>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MeterReading>>> GetHistory(string accountNumber)
    {
        var history = await _usageService.GetHistoryAsync(accountNumber);
        return Ok(history);
    }
}
