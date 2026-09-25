using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NWSDB.UsageService.DTOs;
using NWSDB.UsageService.Models;
using NWSDB.UsageService.Services;

namespace NWSDB.UsageService.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
[Authorize]
public class UsageController : ControllerBase
{
    private readonly IUsageService _usageService;

    public UsageController(IUsageService usageService)
    {
        _usageService = usageService;
    }

    [HttpPost("readings")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(MeterReading), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MeterReading>> RecordReading(RecordReadingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountNumber))
            return BadRequest("accountNumber is required.");

        if (request.CubicMetres < 0)
            return BadRequest("cubicMetres cannot be negative.");

        try
        {
            var reading = await _usageService.RecordReadingAsync(request);
            return CreatedAtAction(nameof(GetHistory), new { accountNumber = reading.AccountNumber }, reading);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{accountNumber}/latest")]
    [ProducesResponseType(typeof(UsageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UsageResponse>> GetLatest(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            return BadRequest("accountNumber is required.");

        if (!CanAccessAccount(accountNumber))
            return Forbid();

        var usage = await _usageService.GetLatestUsageAsync(accountNumber);
        return usage is null ? NotFound() : Ok(usage);
    }

    [HttpGet("{accountNumber}/history")]
    [ProducesResponseType(typeof(IEnumerable<MeterReading>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IEnumerable<MeterReading>>> GetHistory(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            return BadRequest("accountNumber is required.");

        if (!CanAccessAccount(accountNumber))
            return Forbid();

        var history = await _usageService.GetHistoryAsync(accountNumber);
        return Ok(history);
    }

    private bool CanAccessAccount(string accountNumber)
    {
        if (User.IsInRole("Staff") || User.IsInRole("Admin"))
            return true;

        var tokenAccount = User.FindFirstValue("accountNumber");
        return !string.IsNullOrWhiteSpace(tokenAccount) &&
               string.Equals(tokenAccount, accountNumber.Trim(), StringComparison.OrdinalIgnoreCase);
    }
}
