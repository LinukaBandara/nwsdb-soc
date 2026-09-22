using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NWSDB.PaymentService.Models;
using NWSDB.PaymentService.Services;

namespace NWSDB.PaymentService.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost]
    [Authorize(Roles = "Customer,Staff,Admin")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PaymentResponse>> CreatePayment(CreatePaymentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountNumber))
            return BadRequest("accountNumber is required.");

        if (!CanAccessAccount(request.AccountNumber))
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Channel))
            return BadRequest("channel is required.");

        try
        {
            var payment = await _paymentService.CreatePaymentAsync(request);
            return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, PaymentResponse.FromEntity(payment));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PaymentResponse>> GetPayment(int id)
    {
        var payment = await _paymentService.GetPaymentAsync(id);
        if (payment is null) return NotFound();
        if (!CanAccessAccount(payment.AccountNumber)) return Forbid();

        return Ok(PaymentResponse.FromEntity(payment));
    }

    [HttpGet("account/{accountNumber}")]
    [ProducesResponseType(typeof(IEnumerable<PaymentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IEnumerable<PaymentResponse>>> GetPaymentsForAccount(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            return BadRequest("accountNumber is required.");

        if (!CanAccessAccount(accountNumber))
            return Forbid();

        var payments = await _paymentService.GetPaymentsForAccountAsync(accountNumber);
        return Ok(payments.Select(PaymentResponse.FromEntity));
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> UpdateStatus(int id, [FromBody] PaymentStatus status)
    {
        var payment = await _paymentService.UpdateStatusAsync(id, status);
        return payment is null ? NotFound() : Ok(PaymentResponse.FromEntity(payment));
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
