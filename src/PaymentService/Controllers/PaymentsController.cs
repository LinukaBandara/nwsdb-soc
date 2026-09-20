using Microsoft.AspNetCore.Mvc;
using NWSDB.PaymentService.Models;
using NWSDB.PaymentService.Services;

namespace NWSDB.PaymentService.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    /// <summary>Create a new bill payment.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PaymentResponse>> CreatePayment(CreatePaymentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountNumber))
            return BadRequest("accountNumber is required.");

        if (string.IsNullOrWhiteSpace(request.Channel))
            return BadRequest("channel is required.");

        try
        {
            var payment = await _paymentService.CreatePaymentAsync(request);
            var response = PaymentResponse.FromEntity(payment);
            return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Get a single payment by id.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> GetPayment(int id)
    {
        var payment = await _paymentService.GetPaymentAsync(id);
        return payment is null ? NotFound() : Ok(PaymentResponse.FromEntity(payment));
    }

    /// <summary>Get payment history for an NWSDB account.</summary>
    [HttpGet("account/{accountNumber}")]
    [ProducesResponseType(typeof(IEnumerable<PaymentResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<PaymentResponse>>> GetPaymentsForAccount(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            return BadRequest("accountNumber is required.");

        var payments = await _paymentService.GetPaymentsForAccountAsync(accountNumber);
        return Ok(payments.Select(PaymentResponse.FromEntity));
    }

    /// <summary>Update the status of an existing payment.</summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> UpdateStatus(int id, [FromBody] PaymentStatus status)
    {
        var payment = await _paymentService.UpdateStatusAsync(id, status);
        return payment is null ? NotFound() : Ok(PaymentResponse.FromEntity(payment));
    }
}
