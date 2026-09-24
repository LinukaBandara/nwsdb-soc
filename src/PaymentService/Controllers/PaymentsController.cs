using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
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
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(IPaymentService paymentService, IConfiguration configuration, ILogger<PaymentsController> logger)
    {
        _paymentService = paymentService;
        _configuration = configuration;
        _logger = logger;
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

    [HttpPost("payhere/checkout")]
    [Authorize(Roles = "Customer,Staff,Admin")]
    public async Task<ActionResult<PayHereCheckoutResponse>> CreatePayHereCheckout([FromBody] PayHereCheckoutRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountNumber))
            return BadRequest("accountNumber is required.");
        if (!CanAccessAccount(request.AccountNumber))
            return Forbid();
        if (request.Amount <= 0)
            return BadRequest("Payment amount must be greater than zero.");

        var merchantId = _configuration["PayHere:MerchantId"];
        var merchantSecret = _configuration["PayHere:MerchantSecret"];
        var sandbox = _configuration.GetValue("PayHere:Sandbox", true);
        var notifyUrl = _configuration["PayHere:NotifyUrl"];

        if (string.IsNullOrWhiteSpace(merchantId) || string.IsNullOrWhiteSpace(merchantSecret))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "PayHere Sandbox is not configured.");
        if (string.IsNullOrWhiteSpace(notifyUrl))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "PayHere notify URL is not configured.");

        var payment = await _paymentService.CreatePendingPaymentAsync(
            new CreatePaymentRequest(request.AccountNumber, request.Amount, "PayHere-Sandbox"));

        var orderId = payment.ReferenceNumber;
        var amount = request.Amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);
        var hash = CreatePayHereCheckoutHash(merchantId, orderId, amount, "LKR", merchantSecret);

        var customerName = User.FindFirstValue(ClaimTypes.Name) ?? "NWSDB Customer";
        var parts = customerName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var firstName = parts.Length > 0 ? parts[0] : "NWSDB";
        var lastName = parts.Length > 1 ? parts[1] : "Customer";
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "customer@nwsdb.local";
        var origin = Request.Headers.Origin.FirstOrDefault();
        var returnUrl = string.IsNullOrWhiteSpace(origin) ? "http://localhost:5173/?payhere=return&orderId=" + Uri.EscapeDataString(orderId) : $"{origin}/?payhere=return&orderId={Uri.EscapeDataString(orderId)}";
        var cancelUrl = string.IsNullOrWhiteSpace(origin) ? "http://localhost:5173/?payhere=cancel&orderId=" + Uri.EscapeDataString(orderId) : $"{origin}/?payhere=cancel&orderId={Uri.EscapeDataString(orderId)}";

        return Ok(new PayHereCheckoutResponse(
            sandbox ? "https://sandbox.payhere.lk/pay/checkout" : "https://www.payhere.lk/pay/checkout",
            new Dictionary<string, string>
            {
                ["merchant_id"] = merchantId,
                ["return_url"] = returnUrl,
                ["cancel_url"] = cancelUrl,
                ["notify_url"] = notifyUrl,
                ["first_name"] = firstName,
                ["last_name"] = lastName,
                ["email"] = email,
                ["phone"] = "0770000000",
                ["address"] = "NWSDB Customer",
                ["city"] = "Colombo",
                ["country"] = "Sri Lanka",
                ["order_id"] = orderId,
                ["items"] = $"NWSDB Water Bill - {request.AccountNumber}",
                ["currency"] = "LKR",
                ["amount"] = amount,
                ["hash"] = hash,
                ["custom_1"] = request.AccountNumber
            }));
    }

    [AllowAnonymous]
    [IgnoreAntiforgeryToken]
    [HttpPost("payhere/notify")]
    public async Task<IActionResult> PayHereNotify()
    {
        if (!Request.HasFormContentType)
            return BadRequest("PayHere notification must use form data.");

        var form = await Request.ReadFormAsync();
        var merchantId = form["merchant_id"].ToString();
        var orderId = form["order_id"].ToString();
        var amount = form["payhere_amount"].ToString();
        var currency = form["payhere_currency"].ToString();
        var statusCode = form["status_code"].ToString();
        var receivedSignature = form["md5sig"].ToString();
        var merchantSecret = _configuration["PayHere:MerchantSecret"];

        if (string.IsNullOrWhiteSpace(merchantSecret) ||
            !string.Equals(merchantId, _configuration["PayHere:MerchantId"], StringComparison.Ordinal))
            return BadRequest();

        var expectedSignature = CreatePayHereNotificationHash(merchantId, orderId, amount, currency, statusCode, merchantSecret);

        _logger.LogInformation(
            "PayHere notification received. OrderId={OrderId}, StatusCode={StatusCode}, Amount={Amount}, Currency={Currency}",
            orderId, statusCode, amount, currency);

        var receivedBytes = Encoding.UTF8.GetBytes(receivedSignature.Trim().ToUpperInvariant());
        var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);

        if (receivedBytes.Length != expectedBytes.Length ||
            !CryptographicOperations.FixedTimeEquals(expectedBytes, receivedBytes))
        {
            _logger.LogWarning("PayHere signature mismatch for order {OrderId}.", orderId);
            return BadRequest();
        }

        if (!string.Equals(currency, "LKR", StringComparison.OrdinalIgnoreCase) ||
            !decimal.TryParse(amount, NumberStyles.Number, CultureInfo.InvariantCulture, out var gatewayAmount))
            return BadRequest();

        var accountNumber = form["custom_1"].ToString();
        if (string.IsNullOrWhiteSpace(accountNumber))
            return BadRequest();

        var payments = await _paymentService.GetPaymentsForAccountAsync(accountNumber);
        var existingPayment = payments.FirstOrDefault(p => p.ReferenceNumber == orderId);

        if (existingPayment is null)
        {
            _logger.LogWarning("PayHere notification received for unknown order {OrderId}", orderId);
            return NotFound();
        }

        if (existingPayment.Amount != gatewayAmount)
        {
            _logger.LogWarning(
                "PayHere amount mismatch. OrderId={OrderId}, StoredAmount={StoredAmount}, GatewayAmount={GatewayAmount}",
                orderId, existingPayment.Amount, gatewayAmount);
            return BadRequest();
        }

        var status = statusCode switch
        {
            "2" => PaymentStatus.Completed,
            "-1" or "-2" or "-3" => PaymentStatus.Failed,
            "0" => PaymentStatus.Pending,
            _ => PaymentStatus.Pending
        };

        var payment = await _paymentService.UpdateStatusByReferenceAsync(orderId, status);

        if (payment is null)
            return NotFound();

        _logger.LogInformation(
            "PayHere payment {OrderId} successfully updated to {Status}",
            orderId, status);

        return Ok();
    }

    private static string CreatePayHereCheckoutHash(string merchantId, string orderId, string amount, string currency, string merchantSecret)
    {
        var secretHash = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(merchantSecret))).ToUpperInvariant();
        var source = merchantId + orderId + amount + currency + secretHash;
        return Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(source))).ToUpperInvariant();
    }

    private static string CreatePayHereNotificationHash(string merchantId, string orderId, string amount, string currency, string statusCode, string merchantSecret)
    {
        var secretHash = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(merchantSecret))).ToUpperInvariant();
        var source = merchantId + orderId + amount + currency + statusCode + secretHash;
        return Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(source))).ToUpperInvariant();
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
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> UpdateStatus(int id, [FromBody] UpdatePaymentStatusRequest request)
    {
        if (!Enum.TryParse<PaymentStatus>(request.Status, true, out var status))
            return BadRequest("Status must be Pending, Completed or Failed.");

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

public record UpdatePaymentStatusRequest(string Status);

public record PayHereCheckoutRequest(string AccountNumber, decimal Amount);
public record PayHereCheckoutResponse(string ActionUrl, Dictionary<string, string> Fields);
