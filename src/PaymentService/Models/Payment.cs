namespace NWSDB.PaymentService.Models;

public class Payment
{
    public int Id { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Channel { get; set; } = string.Empty;
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string ReferenceNumber { get; set; } = Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
}

public enum PaymentStatus
{
    Pending,
    Completed,
    Failed
}