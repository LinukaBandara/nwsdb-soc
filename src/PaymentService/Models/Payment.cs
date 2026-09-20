namespace NWSDB.PaymentService.Models;

/// <summary>
/// Represents a single bill payment made by a customer, either directly
/// through the NWSDB website/app or through a registered third-party
/// payment partner (bank app, mobile wallet, kiosk, etc.).
/// </summary>
public class Payment
{
    public int Id { get; set; }

    /// <summary>NWSDB customer / account number.</summary>
    public string AccountNumber { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    /// <summary>e.g. "NWSDB-Portal", "BankOfCeylon-App", "eZCash", "FrimiWallet".</summary>
    public string Channel { get; set; } = string.Empty;

    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>Reference number returned to the third-party partner / customer.</summary>
    public string ReferenceNumber { get; set; } = Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
}

public enum PaymentStatus
{
    Pending,
    Completed,
    Failed
}

/// <summary>DTO used to create a new payment. Keeps the public API contract
/// independent from the internal persistence model (a core SOA principle:
/// services expose a stable contract, not their internal schema).</summary>
public record CreatePaymentRequest(string AccountNumber, decimal Amount, string Channel);

public record PaymentResponse(int Id, string AccountNumber, decimal Amount, string Channel,
    string Status, string ReferenceNumber, DateTime CreatedAtUtc)
{
    public static PaymentResponse FromEntity(Payment p) => new(
        p.Id, p.AccountNumber, p.Amount, p.Channel, p.Status.ToString(), p.ReferenceNumber, p.CreatedAtUtc);
}
