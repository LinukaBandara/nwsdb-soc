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

    /// <summary>Record a new meter reading.</summary>
    [HttpPost("readings")]
    [ProducesResponseType(typeof(MeterReading), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MeterReading>> RecordReading(RecordReadingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountNumber))
            return BadRequest("accountNumber is required.");

        if (request.CubicMetres < 0)
            return BadRequest("cubicMetres cannot be negative.");

        var reading = await _usageService.RecordReadingAsync(request);
        return CreatedAtAction(nameof(GetHistory), new { accountNumber = reading.AccountNumber }, reading);
    }

    /// <summary>Get the latest usage and estimated bill for an account.</summary>
    [HttpGet("{accountNumber}/latest")]
    [ProducesResponseType(typeof(UsageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UsageResponse>> GetLatest(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            return BadRequest("accountNumber is required.");

        var usage = await _usageService.GetLatestUsageAsync(accountNumber);
        return usage is null ? NotFound() : Ok(usage);
    }

    /// <summary>Get meter-reading history for an account.</summary>
    [HttpGet("{accountNumber}/history")]
    [ProducesResponseType(typeof(IEnumerable<MeterReading>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MeterReading>>> GetHistory(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            return BadRequest("accountNumber is required.");

        var history = await _usageService.GetHistoryAsync(accountNumber);
        return Ok(history);
    }
}
